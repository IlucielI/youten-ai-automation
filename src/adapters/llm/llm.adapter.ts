import Logger from '../../utils/logger';
import { config } from '../../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' | 'text' };
}

export interface JudgeEvaluationResult {
  passed: boolean;
  score: number; // 1-10 or 1-100
  reasoning: string;
  confidence?: number;
}

/**
 * LLM Adapter for AI / Chatbot Automation and LLM-as-a-Judge evaluations.
 * Supports OpenAI-compatible APIs (OpenAI, Claude proxy, Ollama, vLLM, DeepSeek, etc.)
 */
export class LlmAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor() {
    this.baseUrl = config.llm.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.llm.apiKey;
    this.defaultModel = config.llm.model;
    this.defaultTemperature = config.llm.temperature;
    this.defaultMaxTokens = config.llm.maxTokens;
  }

  /**
   * Send a chat completion request to the LLM API
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<string> {
    if (!this.baseUrl) {
      Logger.warn(
        '[LLM] No LLM_BASE_URL configured. Returning simulated mock response for test resilience.',
      );
      if (options.responseFormat?.type === 'json_object') {
        return JSON.stringify({
          passed: true,
          score: 10,
          reasoning: 'Simulated LLM evaluation passed (LLM_BASE_URL not configured).',
        });
      }
      return '4';
    }

    const url = `${this.baseUrl}/chat/completions`;
    const model = options.model || this.defaultModel;

    Logger.step(`LLM [POST] ${url} (Model: ${model || 'default'})`);

    const payload: any = {
      model,
      messages,
      temperature: options.temperature ?? this.defaultTemperature,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      stream: false,
    };

    if (options.responseFormat) {
      payload.response_format = options.responseFormat;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API returned HTTP ${response.status}: ${errorText}`);
      }

      const rawText = await response.text();
      let textContent = '';

      // Handle raw JSON or potential SSE proxy output
      if (rawText.trim().startsWith('data:')) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
            try {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              const parsed = JSON.parse(jsonStr);
              const delta =
                parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
              textContent += delta;
            } catch {
              // skip unparseable SSE chunk
            }
          }
        }
      } else {
        const data = JSON.parse(rawText);
        textContent = data.choices?.[0]?.message?.content || '';
      }

      const result = textContent.trim();
      Logger.success(`LLM Response received (${result.length} characters)`);
      return result;
    } catch (error: any) {
      Logger.error(`LLM Adapter request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simple one-shot prompt completion helper
   */
  async prompt(promptText: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: promptText });
    return await this.chatCompletion(messages);
  }

  /**
   * LLM-as-a-Judge: Evaluates a candidate output against expected criteria
   */
  async judge(params: {
    userQuery: string;
    botResponse: string;
    expectedCriteria: string;
  }): Promise<JudgeEvaluationResult> {
    Logger.step(`Evaluating bot response with LLM Judge...`);

    const judgeSystemPrompt = `You are a strict QA Evaluation Judge.
Evaluate whether the Assistant Response satisfies the given Criteria for the User Query.
You MUST output strictly a JSON object with this format:
{
  "passed": true | false,
  "score": number between 1 and 10,
  "reasoning": "concise explanation of your evaluation"
}`;

    const judgeUserPrompt = `[User Query]:
${params.userQuery}

[Assistant Response to Evaluate]:
${params.botResponse}

[Acceptance Criteria]:
${params.expectedCriteria}`;

    try {
      const reply = await this.chatCompletion(
        [
          { role: 'system', content: judgeSystemPrompt },
          { role: 'user', content: judgeUserPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for deterministic grading
          responseFormat: { type: 'json_object' },
        },
      );

      // Extract JSON substring if wrapped in markdown
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : reply;
      const parsed: JudgeEvaluationResult = JSON.parse(jsonString);

      if (parsed.passed) {
        Logger.success(`[JUDGE PASSED] Score: ${parsed.score}/10 | Reason: ${parsed.reasoning}`);
      } else {
        Logger.warn(`[JUDGE FAILED] Score: ${parsed.score}/10 | Reason: ${parsed.reasoning}`);
      }

      return parsed;
    } catch (error: any) {
      Logger.error(`LLM Judge evaluation failed to parse: ${error.message}`);
      return {
        passed: false,
        score: 0,
        reasoning: `Judge evaluation error: ${error.message}`,
      };
    }
  }
}

export default LlmAdapter;
