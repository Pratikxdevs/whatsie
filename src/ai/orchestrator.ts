import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionManager, ChatMessage } from '../services/sessionManager';
import { logger } from '../config/logger';
import { recordAiUsage } from '../billing/recordUsage';
import { prisma } from '../db/prisma';

// Dynamic client caching
let openaiClient: OpenAI | null = null;
let googleAiClient: GoogleGenerativeAI | null = null;
let cachedProvider: string | null = null;

/**
 * Get or create OpenAI-compatible client.
 * Re-creates if provider changes (e.g., from env to per-bot config).
 */
function getOpenAIClient(provider: string, apiKey: string, baseURL?: string): OpenAI {
  if (openaiClient && cachedProvider === provider) return openaiClient;

  openaiClient = new OpenAI({ baseURL, apiKey });
  cachedProvider = provider;
  return openaiClient;
}

/**
 * Resolve AI config for a tenant+user.
 * Priority: bot config > user credential > env vars > defaults
 */
async function resolveAiConfig(tenantId: string, userId?: string): Promise<{
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}> {
  // Try to get bot config from DB
  let botConfig: Record<string, any> = {};
  try {
    const bot = await prisma.bot.findFirst({
      where: { tenantId, status: 'connected' },
    });
    if (bot?.config && typeof bot.config === 'object') {
      botConfig = bot.config as Record<string, any>;
    }
  } catch {
    // DB lookup failed — fall through to env vars
  }

  // Resolve provider
  const provider = botConfig.ai_engine || process.env.DEFAULT_AI_PROVIDER || 'groq';

  // Check user's credential for this provider
  let userApiKey: string | undefined;
  if (userId) {
    try {
      const credential = await prisma.userCredential.findFirst({
        where: { userId, provider, isDefault: true },
      });
      if (credential) {
        userApiKey = credential.keyValue;
      }
    } catch {
      // DB lookup failed — fall through to env vars
    }
  }

  // Resolve API key per provider: bot config > user credential > env vars
  let apiKey: string;
  let baseURL: string | undefined;

  switch (provider) {
    case 'groq':
      apiKey = botConfig.api_key || botConfig.groq_api_key || userApiKey || process.env.GROQ_API_KEY || '';
      baseURL = 'https://api.groq.com/openai/v1';
      break;
    case 'openrouter':
      apiKey = botConfig.api_key || userApiKey || process.env.OPENROUTER_API_KEY || '';
      baseURL = 'https://openrouter.ai/api/v1';
      break;
    case 'openai':
      apiKey = botConfig.api_key || userApiKey || process.env.OPENAI_API_KEY || '';
      break;
    case 'gemini':
      apiKey = botConfig.api_key || userApiKey || process.env.GEMINI_API_KEY || '';
      break;
    default:
      apiKey = botConfig.api_key || userApiKey || process.env.GROQ_API_KEY || '';
      baseURL = 'https://api.groq.com/openai/v1';
  }

  // Resolve model
  const defaultModels: Record<string, string> = {
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    openai: 'gpt-4o-mini',
    openrouter: 'meta-llama/llama-3-8b-instruct',
    gemini: 'gemini-2.0-flash',
  };
  const model = process.env.DEFAULT_MODEL || defaultModels[provider] || 'meta-llama/llama-4-scout-17b-16e-instruct';

  return {
    provider,
    model,
    apiKey,
    baseURL,
    systemPrompt: botConfig.system_prompt || 'You are a helpful CRM assistant. Be concise and professional.',
    temperature: botConfig.temperature ?? 1,
    maxTokens: botConfig.max_tokens ?? 1024,
  };
}

/**
 * Generate an AI response for an incoming message.
 */
export async function generateAiResponse(
  tenantId: string,
  userId: string,
  incomingMessageText: string,
  systemPromptOverride?: string,
): Promise<string> {
  const config = await resolveAiConfig(tenantId, userId);
  const systemPrompt = systemPromptOverride || config.systemPrompt;

  // Validate API key
  if (!config.apiKey) {
    logger.error({ provider: config.provider, tenantId }, 'No AI API key configured');
    return "I'm currently unable to process your request. Please configure an AI provider.";
  }

  // 1. Fetch conversation history
  const history = await SessionManager.getContext(tenantId, userId);

  // 2. Prepare messages
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: incomingMessageText },
  ];

  // 3. Dispatch to provider
  try {
    if (config.provider === 'gemini') {
      return await generateGeminiResponse(config, systemPrompt, history, incomingMessageText, tenantId);
    } else {
      return await generateOpenAICompatibleResponse(config, messages, tenantId);
    }
  } catch (err: any) {
    logger.error({ err: err.message, provider: config.provider, tenantId }, 'AI generation failed');
    return "I'm having trouble processing your request right now. Please try again in a moment.";
  }
}

/**
 * Generate response via OpenAI-compatible API (Groq, OpenAI, OpenRouter)
 */
async function generateOpenAICompatibleResponse(
  config: Awaited<ReturnType<typeof resolveAiConfig>>,
  messages: ChatMessage[],
  tenantId: string,
): Promise<string> {
  const client = getOpenAIClient(config.provider, config.apiKey!, config.baseURL);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: messages as any[],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  const usage = response.usage;
  if (usage) {
    recordAiUsage(tenantId, config.model, usage.prompt_tokens || 0, usage.completion_tokens || 0)
      .catch(err => logger.error({ err }, 'Failed to record AI usage'));
  }

  const text = response.choices[0]?.message?.content || "I received your message. How can I help you?";
  logger.info({ provider: config.provider, model: config.model, tenantId }, 'AI response generated');
  return text;
}

/**
 * Generate response via Google Gemini
 */
async function generateGeminiResponse(
  config: Awaited<ReturnType<typeof resolveAiConfig>>,
  systemPrompt: string,
  history: ChatMessage[],
  incomingMessageText: string,
  tenantId: string,
): Promise<string> {
  if (!googleAiClient) {
    googleAiClient = new GoogleGenerativeAI(config.apiKey!);
  }

  const genModel = googleAiClient.getGenerativeModel({ model: config.model });
  const geminiHistory = history.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = genModel.startChat({
    history: geminiHistory,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(incomingMessageText);
  const geminiUsage = result.response.usageMetadata;

  if (geminiUsage) {
    recordAiUsage(tenantId, config.model, geminiUsage.promptTokenCount || 0, geminiUsage.candidatesTokenCount || 0)
      .catch(err => logger.error({ err }, 'Failed to record AI usage'));
  }

  const text = result.response.text() || "I received your message. How can I help you?";
  logger.info({ provider: 'gemini', model: config.model, tenantId }, 'AI response generated');
  return text;
}
