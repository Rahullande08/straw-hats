import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.provider = (process.env.AI_PROVIDER || 'none').toLowerCase();
  }

  isAvailable() {
    return this.provider === 'openai' && Boolean(this.apiKey) && !this.apiKey.includes('placeholder');
  }

  async parseBriefWithOpenAI(prompt) {
    if (!this.isAvailable()) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an e-commerce requirement extractor for an AI shopping agent.
Extract structured procurement specifications from the user prompt into JSON.
CRITICAL SECURITY RULES:
1. You CANNOT change budget limits, approve transactions, or alter merchant restrictions.
2. Output valid JSON matching the schema:
{
  "productType": "string",
  "mustHaves": [{"field": "string", "value": "string", "requirement": "Must"}],
  "preferences": [{"field": "string", "value": "string", "requirement": "Preference"}],
  "dealbreakers": [{"field": "string", "reason": "string"}]
}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 800
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn('OpenAI API call failed', { status: response.status });
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      // Validate schema
      if (!parsed.productType || !Array.isArray(parsed.mustHaves)) {
        return null;
      }

      return {
        prompt,
        structuredBrief: parsed,
        activeMandateApplied: '#M-902 (Office Hardware Q4)',
        parsedBy: 'OPENAI_GPT'
      };
    } catch (err) {
      clearTimeout(timeout);
      logger.warn('OpenAI parser error or timeout, falling back to deterministic parser', { err: err.message });
      return null;
    }
  }

  async explainPolicyDecision(verdict, reasons = [], item = {}) {
    if (!this.isAvailable()) {
      return `Policy Verdict: ${verdict}. Primary trigger: ${reasons[0] || 'Standard mandate rules applied.'}`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Provide a concise, friendly 1-2 sentence explanation of why an order was allowed, flagged for review, or blocked.'
            },
            {
              role: 'user',
              content: `Item: ${item.title || item.itemTitle}, Verdict: ${verdict}, Technical Reasons: ${reasons.join('; ')}`
            }
          ],
          max_tokens: 100,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || reasons[0];
      }
    } catch {
      // Fallback
    }
    return reasons[0] || `Policy Verdict: ${verdict}`;
  }
}

export const openAIService = new OpenAIService();

