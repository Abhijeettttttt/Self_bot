/**
 * Core chat interfaces for the Abhijeet Chatbot.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  stickerId?: string;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'model'; content: string }>;
}

export interface ChatResponse {
  text: string;
  stickerId?: string;
}

export interface ChatErrorResponse {
  error: string;
  retryable: boolean;
}
