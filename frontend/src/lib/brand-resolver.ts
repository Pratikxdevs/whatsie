/**
 * Resolves an AI provider slug to a brand logo using logo.dev
 * Fallback to icon.horse if logo.dev fails or domain is obscure.
 */

const domainMap: Record<string, string> = {
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'google': 'google.com',
  'meta-llama': 'meta.com',
  'mistralai': 'mistral.ai',
  'cohere': 'cohere.com',
  'microsoft': 'microsoft.com',
  'databricks': 'databricks.com',
  'liquid': 'liquid.ai',
  'amazon': 'amazon.com',
  'x-ai': 'x.ai',
  'qwen': 'alibabacloud.com',
  'deepseek': 'deepseek.com',
  'perplexity': 'perplexity.ai',
  '01-ai': '01.ai',
};

export function resolveProviderLogo(providerSlug: string): string {
  const domain = domainMap[providerSlug.toLowerCase()];
  
  if (!domain) {
    // If unknown provider, use a generic AI icon
    return `https://ui-avatars.com/api/?name=${providerSlug}&background=27272a&color=fff&rounded=true&font-size=0.5`;
  }

  // Use logo.dev as requested by the architectural directive
  return `https://img.logo.dev/${domain}?token=pk_YOUR_LOGO_DEV_TOKEN&retina=true`;
}

export function getProviderLogoUrls(providerSlug: string): string[] {
  const domain = domainMap[providerSlug.toLowerCase()];
  
  if (!domain) {
    return [
      `https://ui-avatars.com/api/?name=${providerSlug}&background=27272a&color=fff&rounded=true&font-size=0.5`
    ];
  }

  return [
    `https://img.logo.dev/${domain}?token=pk_YOUR_LOGO_DEV_TOKEN&retina=true`,
    `https://icon.horse/icon/${domain}`,
    `https://ui-avatars.com/api/?name=${providerSlug}&background=27272a&color=fff&rounded=true&font-size=0.5`
  ];
}

export function getBrandColor(providerSlug: string): string {
  const colorMap: Record<string, string> = {
    'openai': '#10a37f',
    'anthropic': '#000000',
    'google': '#4285F4',
    'meta-llama': '#0668E1',
    'mistralai': '#FF7000',
    'deepseek': '#4D6BFE',
    'perplexity': '#22B8CD',
  };
  return colorMap[providerSlug.toLowerCase()] || '#27272a'; // zinc-800 default
}
