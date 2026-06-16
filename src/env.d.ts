declare namespace NodeJS {
  interface ProcessEnv {
    /** Google Gemini API key for LLM backend */
    GEMINI_API_KEY: string;
    /** Encoded personality system prompt for the chatbot */
    SYSTEM_PROMPT: string;
    /** Public-facing app name displayed in the UI */
    NEXT_PUBLIC_APP_NAME: string;
  }
}
