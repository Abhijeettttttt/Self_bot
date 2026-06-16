import { describe, it, expect } from 'vitest';
import { buildPrompt } from './build-prompt';

describe('buildPrompt', () => {
  const systemPrompt = 'You are Abhijeet. Respond in Hinglish.';

  it('returns a valid GeminiRequest with empty history', () => {
    const result = buildPrompt({
      systemPrompt,
      history: [],
      userMessage: 'Hello bhai!',
    });

    expect(result.systemInstruction).toEqual({
      parts: [{ text: systemPrompt }],
    });
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'Hello bhai!' }],
    });
    expect(result.generationConfig).toEqual({
      maxOutputTokens: 256,
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
    });
  });

  it('includes history messages in order before user message', () => {
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'model' as const, content: 'Hey bro!' },
      { role: 'user' as const, content: 'Kya haal?' },
      { role: 'model' as const, content: 'Sab badhiya' },
    ];

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Aur bata',
    });

    expect(result.contents).toHaveLength(5);
    expect(result.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Hi' }] });
    expect(result.contents[1]).toEqual({ role: 'model', parts: [{ text: 'Hey bro!' }] });
    expect(result.contents[2]).toEqual({ role: 'user', parts: [{ text: 'Kya haal?' }] });
    expect(result.contents[3]).toEqual({ role: 'model', parts: [{ text: 'Sab badhiya' }] });
    expect(result.contents[4]).toEqual({ role: 'user', parts: [{ text: 'Aur bata' }] });
  });

  it('truncates history from front when exceeding maxHistoryMessages', () => {
    // Create 25 history messages
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
      content: `Message ${i}`,
    }));

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Latest message',
    });

    // 20 history messages + 1 user message = 21 total
    expect(result.contents).toHaveLength(21);

    // First content should be message 5 (oldest 5 removed)
    expect(result.contents[0].parts[0].text).toBe('Message 5');

    // Last content should be the current user message
    expect(result.contents[20]).toEqual({
      role: 'user',
      parts: [{ text: 'Latest message' }],
    });
  });

  it('preserves order after truncation', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
      content: `Msg ${i}`,
    }));

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Final',
    });

    // Should keep messages 10-29 (the 20 most recent)
    for (let i = 0; i < 20; i++) {
      expect(result.contents[i].parts[0].text).toBe(`Msg ${i + 10}`);
    }
  });

  it('respects custom maxHistoryMessages', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: `Msg ${i}`,
    }));

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Hello',
      maxHistoryMessages: 5,
    });

    // 5 history + 1 user message = 6
    expect(result.contents).toHaveLength(6);
    // Should keep messages 5-9 (the 5 most recent)
    expect(result.contents[0].parts[0].text).toBe('Msg 5');
    expect(result.contents[4].parts[0].text).toBe('Msg 9');
  });

  it('does not truncate when history is within limit', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
      content: `Msg ${i}`,
    }));

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Hello',
    });

    // 15 history + 1 user message = 16
    expect(result.contents).toHaveLength(16);
    expect(result.contents[0].parts[0].text).toBe('Msg 0');
  });

  it('always includes system prompt as systemInstruction', () => {
    const longPrompt = 'A'.repeat(5000);

    const result = buildPrompt({
      systemPrompt: longPrompt,
      history: Array.from({ length: 50 }, (_, i) => ({
        role: 'user' as const,
        content: `Msg ${i}`,
      })),
      userMessage: 'Test',
    });

    expect(result.systemInstruction.parts[0].text).toBe(longPrompt);
  });

  it('handles exactly 20 history messages without truncation', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
      content: `Msg ${i}`,
    }));

    const result = buildPrompt({
      systemPrompt,
      history,
      userMessage: 'Hello',
    });

    // 20 history + 1 user message = 21
    expect(result.contents).toHaveLength(21);
    expect(result.contents[0].parts[0].text).toBe('Msg 0');
    expect(result.contents[19].parts[0].text).toBe('Msg 19');
  });

  it('user message is always the final entry in contents', () => {
    const result = buildPrompt({
      systemPrompt,
      history: [
        { role: 'user', content: 'First' },
        { role: 'model', content: 'Response' },
      ],
      userMessage: 'I should be last',
    });

    const lastEntry = result.contents[result.contents.length - 1];
    expect(lastEntry.role).toBe('user');
    expect(lastEntry.parts[0].text).toBe('I should be last');
  });
});
