import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { parseStickerResponse } from '@/lib/sticker-parser';
import type { ChatRequest, ChatResponse, ChatErrorResponse } from '@/lib/types';

/** Timeout duration for API calls (10 seconds) */
const API_TIMEOUT_MS = 10_000;

/**
 * POST /api/chat
 *
 * Accepts a user message and conversation history, calls Groq API (Llama),
 * and returns the chatbot's response with an optional sticker ID.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse | ChatErrorResponse>> {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, history } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required', retryable: false },
        { status: 400 }
      );
    }

    // Read system prompt from environment variable
    const systemPrompt = process.env.SYSTEM_PROMPT;
    if (!systemPrompt) {
      console.error('SYSTEM_PROMPT environment variable is not set');
      return NextResponse.json(
        { error: 'Technical issue aa rhi h yaar', retryable: false },
        { status: 500 }
      );
    }

    // Read API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Technical issue aa rhi h yaar', retryable: false },
        { status: 500 }
      );
    }

    // Build messages array for Groq (OpenAI-compatible format)
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history (last 20 messages)
    const recentHistory = (history || []).slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Initialize Groq client
    const groq = new Groq({ apiKey });

    // Call Groq API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let responseText: string;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
      });

      clearTimeout(timeoutId);

      responseText = completion.choices[0]?.message?.content || '';

      if (!responseText.trim()) {
        return NextResponse.json(
          { error: 'Ek sec, kuchh ajeeb hua', retryable: true },
          { status: 500 }
        );
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        console.error('Groq API error:', error.message);

        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          return NextResponse.json(
            { error: 'Yaar thoda ruk, dimag hang ho gya mera 😵', retryable: true },
            { status: 504 }
          );
        }

        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
          return NextResponse.json(
            { error: 'Bhai thoda break de, bahut bol liya maine 😴', retryable: true },
            { status: 429 }
          );
        }

        if (error.message.includes('401') || error.message.includes('invalid')) {
          return NextResponse.json(
            { error: 'Technical issue aa rhi h yaar', retryable: false },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Kuchh gadbad ho gyi bhai, fr try kr', retryable: true },
        { status: 502 }
      );
    }

    // Parse the response text and extract sticker if present
    const parsed = parseStickerResponse(responseText);

    // Add a random 2-5 second delay to feel more human
    const delay = Math.floor(Math.random() * 3000) + 2000; // 2000-5000ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Build the response
    const chatResponse: ChatResponse = {
      text: parsed.text,
      ...(parsed.stickerId && { stickerId: parsed.stickerId }),
    };

    return NextResponse.json(chatResponse);
  } catch (error: unknown) {
    console.error('Unexpected error in /api/chat:', error);
    return NextResponse.json(
      { error: 'Ek sec, kuchh ajeeb hua', retryable: true },
      { status: 500 }
    );
  }
}
