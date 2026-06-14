import OpenAI from 'openai';
import { SessionManager, ChatMessage } from '../services/sessionManager';
import { logger } from '../config/logger';
import { recordAiUsage } from '../billing/recordUsage';
import { prisma } from '../db/prisma';
import { decryptCredential, isEncrypted } from '../utils/crypto';
import { LRUCache } from 'lru-cache';
import { redisConnection } from '../queue/setup';

// M-003: LRU-capped client cache — max 100 unique API keys, prevents unbounded growth
const openRouterClients = new LRUCache<string, OpenAI>({ max: 100 });


export function getOpenRouterClient(apiKey: string): OpenAI {
  if (openRouterClients.has(apiKey)) {
    return openRouterClients.get(apiKey)!;
  }
  const client = new OpenAI({ 
    baseURL: 'https://openrouter.ai/api/v1', 
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'https://whatsie.crm',
      'X-Title': 'Whatsie CRM'
    }
  });
  openRouterClients.set(apiKey, client);
  return client;
}

export async function resolveAiConfig(tenantId: string, userId?: string): Promise<{
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}> {
  let botConfig: Record<string, any> = {};
  try {
    // M-002: Redis-backed cache — works across multiple processes (PM2 cluster, k8s)
    const cacheKey = `bot_config:${tenantId}`;
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      botConfig = JSON.parse(cached);
    } else {
      const bot = await prisma.bot.findFirst({
        where: { tenantId, status: 'connected' },
      });
      if (bot?.config && typeof bot.config === 'object') {
        botConfig = bot.config as Record<string, any>;
      }
      await redisConnection.set(cacheKey, JSON.stringify(botConfig), 'EX', 60);
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, 'Failed to lookup bot config');
  }

  // Always use OpenRouter
  const provider = 'openrouter';

  // Check user credential for openrouter
  let userApiKey: string | undefined;
  if (userId) {
    try {
      const credential = await prisma.userCredential.findFirst({
        where: { userId, provider: 'openrouter', isDefault: true },
      });
      if (credential) {
        // H-004: decrypt stored key before use
        userApiKey = isEncrypted(credential.keyValue)
          ? decryptCredential(credential.keyValue)
          : credential.keyValue;
      }
    } catch (err: any) {}
  }

  const apiKey = botConfig.api_key || userApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const model = botConfig.model || process.env.DEFAULT_MODEL || 'meta-llama/llama-3-8b-instruct';

  return {
    provider,
    model,
    apiKey,
    systemPrompt: botConfig.system_prompt || 'You are a helpful CRM assistant. Be concise and professional.',
    temperature: botConfig.temperature ?? 1,
    maxTokens: botConfig.maxTokens ?? 1024,
  };
}

export interface AiOutput {
  response: string;
  intent: string;
  isLead: boolean;
  sessionSummary: string;
}

export async function generateAiResponse(
  tenantId: string,
  userId: string,
  incomingMessageText: string,
  systemPromptOverride?: string,
): Promise<AiOutput> {
  const config = await resolveAiConfig(tenantId, userId);
  const basePrompt = systemPromptOverride || config.systemPrompt;
  const systemPrompt = basePrompt + `
  
IMPORTANT INSTRUCTION: You must strictly output your response as a JSON object matching the following structure:
{
  "response": "The actual text response to send to the user",
  "intent": "PRICING | SUPPORT | HUMAN_ESCALATION | INTERESTED | UNKNOWN",
  "isLead": true, // or false
  "sessionSummary": "A brief, condensed summary of the conversation so far, including user needs and context."
}
Do NOT output markdown code blocks (e.g., \`\`\`json). Output only valid raw JSON.
Evaluate if the user is a qualified lead. If they express interest, ask for pricing, or seem like a valid lead for analytics, set "isLead" to true.
`;

  if (!config.apiKey) {
    logger.error({ provider: config.provider, tenantId }, 'No AI API key configured');
    return {
      response: "I'm currently unable to process your request. Please configure your OpenRouter API key.",
      intent: 'UNKNOWN',
      isLead: false,
      sessionSummary: 'API key missing',
    };
  }

  // Inject the previous session summary if it exists
  const state = await SessionManager.getWorkflowState(tenantId, userId);
  const previousSummary = state.sessionSummary ? `Previous Conversation Summary: ${state.sessionSummary}\n` : '';
  
  const history = await SessionManager.getContext(tenantId, userId);
  const messages: ChatMessage[] = [
    { role: 'system', content: previousSummary + systemPrompt },
    ...history,
    { role: 'user', content: incomingMessageText },
  ];

  try {
    const client = getOpenRouterClient(config.apiKey);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: messages as any[],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' }
    });

    const usage = response.usage;
    if (usage) {
      recordAiUsage(tenantId, config.model, usage.prompt_tokens || 0, usage.completion_tokens || 0)
        .catch(err => logger.error({ err }, 'Failed to record AI usage'));
    }

    const text = response.choices[0]?.message?.content || "{}";
    let parsed: AiOutput;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      logger.error({ text }, 'Failed to parse AI JSON response');
      parsed = {
        response: text,
        intent: 'UNKNOWN',
        isLead: false,
        sessionSummary: '',
      };
    }

    logger.info({ 
      module: 'openrouter',
      provider: config.provider, 
      model: config.model, 
      tenantId,
      intent: parsed.intent,
      isLead: parsed.isLead
    }, 'OpenRouter AI completion successful');
    return parsed;
  } catch (err: any) {
    logger.error({ err: err.message, provider: config.provider, tenantId }, 'AI generation failed');
    return {
      response: "I'm having trouble processing your request right now. Please try again in a moment.",
      intent: 'UNKNOWN',
      isLead: false,
      sessionSummary: '',
    };
  }
}
