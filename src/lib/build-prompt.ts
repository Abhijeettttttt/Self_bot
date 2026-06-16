import type { GeminiRequest } from './gemini-types';

/**
 * Configuration for building a Gemini API prompt.
 */
export interface PromptConfig {
  systemPrompt: string;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  userMessage: string;
  maxHistoryMessages?: number;
}

const DEFAULT_MAX_HISTORY_MESSAGES = 20;

/**
 * Builds a structured GeminiRequest from the given prompt configuration.
 *
 * - Always includes the system prompt as systemInstruction
 * - Truncates history from the front (oldest messages removed first) to keep
 *   at most maxHistoryMessages (default 20)
 * - Preserves message ordering
 * - Appends the current user message as the final entry in contents
 */
export function buildPrompt(config: PromptConfig): GeminiRequest {
  const {
    systemPrompt,
    history,
    userMessage,
    maxHistoryMessages = DEFAULT_MAX_HISTORY_MESSAGES,
  } = config;

  // Truncate history from the front (oldest removed first)
  const truncatedHistory = history.length > maxHistoryMessages
    ? history.slice(history.length - maxHistoryMessages)
    : history;

  // Build contents array from truncated history + current user message
  const contents: GeminiRequest['contents'] = [
    ...truncatedHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    },
  ];

  return {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
    },
  };
}
