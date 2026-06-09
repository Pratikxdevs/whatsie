import { describe, it, expect } from 'vitest';
import { IntentClassifier } from './intentClassifier';

describe('IntentClassifier', () => {
  describe('HUMAN_ESCALATION', () => {
    it('detects "human" keyword', () => {
      const result = IntentClassifier.classify('I want to talk to a human');
      expect(result.intent).toBe('HUMAN_ESCALATION');
      expect(result.confidence).toBe(0.95);
    });

    it('detects "agent" keyword', () => {
      const result = IntentClassifier.classify('connect me with an agent');
      expect(result.intent).toBe('HUMAN_ESCALATION');
    });

    it('detects "help" keyword', () => {
      const result = IntentClassifier.classify('help me please');
      expect(result.intent).toBe('HUMAN_ESCALATION');
    });

    it('detects "representative" keyword', () => {
      const result = IntentClassifier.classify('speak to a representative');
      expect(result.intent).toBe('HUMAN_ESCALATION');
    });

    it('detects "talk to someone"', () => {
      const result = IntentClassifier.classify('I need to talk to someone');
      expect(result.intent).toBe('HUMAN_ESCALATION');
    });
  });

  describe('OPT_OUT', () => {
    it('detects "stop"', () => {
      const result = IntentClassifier.classify('stop');
      expect(result.intent).toBe('OPT_OUT');
      expect(result.confidence).toBe(0.99);
    });

    it('detects "unsubscribe"', () => {
      const result = IntentClassifier.classify('I want to unsubscribe');
      expect(result.intent).toBe('OPT_OUT');
    });

    it('detects "cancel"', () => {
      const result = IntentClassifier.classify('cancel my subscription');
      expect(result.intent).toBe('OPT_OUT');
    });

    it('detects "opt out"', () => {
      const result = IntentClassifier.classify('I want to opt out');
      expect(result.intent).toBe('OPT_OUT');
    });
  });

  describe('PRICING', () => {
    it('detects "price"', () => {
      const result = IntentClassifier.classify('what is the price');
      expect(result.intent).toBe('PRICING');
      expect(result.confidence).toBe(0.85);
    });

    it('detects "how much"', () => {
      const result = IntentClassifier.classify('how much does it cost');
      expect(result.intent).toBe('PRICING');
    });

    it('detects "plans"', () => {
      const result = IntentClassifier.classify('show me your plans');
      expect(result.intent).toBe('PRICING');
    });

    it('detects "cost"', () => {
      const result = IntentClassifier.classify('what is the cost');
      expect(result.intent).toBe('PRICING');
    });
  });

  describe('INTERESTED', () => {
    it('detects "interested"', () => {
      const result = IntentClassifier.classify('I am interested in your product');
      expect(result.intent).toBe('INTERESTED');
      expect(result.confidence).toBe(0.80);
    });

    it('detects "buy"', () => {
      const result = IntentClassifier.classify('I want to buy');
      expect(result.intent).toBe('INTERESTED');
    });

    it('detects "get started"', () => {
      const result = IntentClassifier.classify('I want to get started');
      expect(result.intent).toBe('INTERESTED');
    });
  });

  describe('UNKNOWN', () => {
    it('returns UNKNOWN for unmatched input', () => {
      const result = IntentClassifier.classify('tell me a joke');
      expect(result.intent).toBe('UNKNOWN');
      expect(result.confidence).toBe(0);
    });

    it('returns UNKNOWN for empty string', () => {
      const result = IntentClassifier.classify('');
      expect(result.intent).toBe('UNKNOWN');
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      expect(IntentClassifier.classify('HELLO I NEED HELP').intent).toBe('HUMAN_ESCALATION');
      expect(IntentClassifier.classify('STOP').intent).toBe('OPT_OUT');
      expect(IntentClassifier.classify('PRICE').intent).toBe('PRICING');
    });

    it('handles mixed case', () => {
      expect(IntentClassifier.classify('How Much Is It').intent).toBe('PRICING');
      expect(IntentClassifier.classify('I Am Interested').intent).toBe('INTERESTED');
    });
  });
});
