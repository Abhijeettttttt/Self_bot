'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ChatState } from '@/lib/types';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';

export default function ChatPage() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSending = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages, chatState.isLoading, chatState.error]);

  const sendToApi = useCallback(async (content: string, messagesWithUser: ChatMessage[]) => {
    // Build history from last 20 messages
    const history = messagesWithUser
      .slice(-20)
      .map((msg) => ({
        role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        content: msg.content,
      }));

    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 30000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
        signal: abortRef.current.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Kuchh gadbad ho gyi bhai, fr try kr 😵',
        }));
        throw new Error(errorData.error || 'Kuchh gadbad ho gyi bhai, fr try kr 😵');
      }

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.text,
        stickerId: data.stickerId || undefined,
        timestamp: Date.now(),
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      let errorMessage = 'Yaar kuchh toh gadbad ho gyi, fr try kr 😵';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Yaar thoda ruk, dimag hang ho gya mera 😵';
        } else {
          errorMessage = err.message;
        }
      }

      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    } finally {
      isSending.current = false;
    }
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    // Prevent double sends
    if (isSending.current) return;
    isSending.current = true;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Update state first, then trigger API call
    setChatState((prev) => {
      const newMessages = [...prev.messages, userMessage];
      // Schedule API call outside of render cycle
      queueMicrotask(() => sendToApi(content, newMessages));
      return {
        ...prev,
        messages: newMessages,
        isLoading: true,
        error: null,
      };
    });
  }, [sendToApi]);

  const handleRetry = useCallback(() => {
    if (isSending.current) return;

    const lastUserMessage = [...chatState.messages]
      .reverse()
      .find((msg) => msg.role === 'user');

    if (lastUserMessage) {
      isSending.current = true;
      setChatState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));
      sendToApi(lastUserMessage.content, chatState.messages);
    }
  }, [chatState.messages, sendToApi]);

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm mr-3">
          A
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Abhijeet</h1>
      </header>

      {/* Message area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
        {chatState.messages.length === 0 && !chatState.isLoading && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <p>Send a message to start chatting with Abhijeet</p>
          </div>
        )}
        {chatState.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {chatState.isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-1" aria-label="Typing indicator">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {chatState.error && (
          <div className="flex justify-start">
            <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl rounded-bl-sm px-4 py-3 bg-red-100 text-red-800 text-sm sm:text-base">
              <p className="whitespace-pre-wrap">{chatState.error}</p>
              <button
                onClick={handleRetry}
                className="mt-2 px-3 py-1 bg-red-500 text-white text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <ChatInput onSend={handleSendMessage} disabled={chatState.isLoading} />
    </div>
  );
}
