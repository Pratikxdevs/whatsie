export interface IntentResult {
  intent: string;
  confidence: number;
}

/**
 * High-speed Regex and Keyword matcher to bypass LLMs entirely
 * for standard high-volume inquiries safely.
 */
export class IntentClassifier {
  static classify(text: string): IntentResult {
    const lowerText = text.toLowerCase().trim();
    
    // Core Regex & Keyword Matrices
    const humanRegex = /\b(human|agent|representative|talk to someone|help)\b/i;
    const pricingRegex = /\b(price|pricing|cost|how much|plans)\b/i;
    const optOutRegex = /\b(stop|unsubscribe|cancel|opt out|quit)\b/i;
    const interestedRegex = /\b(interested|buy|purchase|sign up|get started)\b/i;

    if (humanRegex.test(lowerText)) {
      return { intent: 'HUMAN_ESCALATION', confidence: 0.95 };
    }
    
    if (optOutRegex.test(lowerText)) {
      return { intent: 'OPT_OUT', confidence: 0.99 };
    }
    
    if (pricingRegex.test(lowerText)) {
      return { intent: 'PRICING', confidence: 0.85 };
    }
    
    if (interestedRegex.test(lowerText)) {
      return { intent: 'INTERESTED', confidence: 0.80 };
    }

    return { intent: 'UNKNOWN', confidence: 0 };
  }
}
