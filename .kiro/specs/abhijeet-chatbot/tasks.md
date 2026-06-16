# Implementation Plan: Abhijeet Chatbot

## Overview

This plan implements a personality-mimicking chatbot as a Next.js (App Router) application with TypeScript, Tailwind CSS, Google Gemini 1.5 Flash integration, and a custom sticker system. The implementation proceeds from foundational project setup through core utilities, API layer, frontend components, and integration wiring. Property-based tests (fast-check) validate correctness properties defined in the design.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Initialize Next.js project with TypeScript, Tailwind CSS, and configure Vitest + fast-check
    - Create Next.js App Router project with TypeScript
    - Install and configure Tailwind CSS
    - Install and configure Vitest with fast-check for property-based testing
    - Create directory structure: `src/app`, `src/lib`, `src/components`, `public/stickers`
    - Add environment variable types in `src/env.d.ts`
    - _Requirements: 6.2, 6.3_

  - [x] 1.2 Define core TypeScript interfaces and types
    - Create `src/lib/types.ts` with `ChatMessage`, `ChatState`, `ChatRequest`, `ChatResponse`, `ChatErrorResponse` interfaces
    - Create `src/lib/gemini-types.ts` with `GeminiRequest`, `GeminiResponse` interfaces
    - Create `src/lib/sticker-types.ts` with `Sticker`, `StickerConfig` interfaces
    - _Requirements: 3.1, 5.2, 7.1_

- [x] 2. Implement system prompt builder and chat log parser
  - [x] 2.1 Implement WhatsApp chat log parser
    - Create `src/lib/chat-log-parser.ts`
    - Parse WhatsApp export format, extracting messages by sender name match
    - Extract vocabulary patterns, frequent phrases (3+ occurrences), emoji frequency
    - Handle multi-participant chats, media omitted markers, and multiline messages
    - Report error if logs are empty or unparseable; warn if fewer than 10 messages
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

  - [x]* 2.2 Write property test for chat log parser (Property 1)
    - **Property 1: Chat log parser extracts only target sender's messages**
    - Generate random WhatsApp-format text with multiple senders, varying timestamps, media omitted markers
    - Verify only messages matching target sender are returned, in chronological order
    - **Validates: Requirements 2.2, 2.4**

  - [x] 2.3 Implement personality report processor
    - Create `src/lib/personality-processor.ts`
    - Extract tone descriptors, sentence patterns, greeting habits, humor style, catchphrases, emoji usage, abbreviations, passion topics, avoidance topics
    - Output structured `PersonalityProfile` object
    - _Requirements: 2.1_

  - [x] 2.4 Implement system prompt builder with token budget enforcement
    - Create `src/lib/system-prompt-builder.ts`
    - Combine personality profile + chat log analysis into system prompt following the template structure from design
    - Include sticker keyword list in prompt
    - Enforce 8000 token budget (truncate examples/phrases if needed)
    - Output final prompt string suitable for storage as environment variable
    - _Requirements: 2.3, 5.2_

  - [x]* 2.5 Write property test for system prompt token budget (Property 2)
    - **Property 2: System prompt stays within token budget (8000 tokens)**
    - Generate random personality profiles with varying field lengths
    - Verify generated system prompt never exceeds 8000 tokens
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement sticker system
  - [x] 4.1 Create sticker registry and configuration
    - Create `public/stickers/stickers.json` with at least 5 sticker entries (id, keywords, file, alt)
    - Create `src/lib/sticker-registry.ts` implementing `getById(id)` → `Sticker | null` and `getKeywordList()` → string
    - Ensure invalid/missing IDs return null gracefully
    - _Requirements: 7.1, 7.4, 7.6_

  - [x] 4.2 Implement sticker response parser
    - Create `src/lib/sticker-parser.ts`
    - Parse LLM response text for `[STICKER:id]` pattern
    - Extract at most one sticker identifier (first match if multiple)
    - Return cleaned text (sticker tags removed) and optional sticker ID
    - _Requirements: 7.2, 7.5_

  - [x]* 4.3 Write property test for sticker parsing (Property 5)
    - **Property 5: Sticker parsing extracts at most one valid sticker**
    - Generate response texts with 0, 1, or N `[STICKER:x]` patterns at random positions
    - Verify at most one sticker extracted (first match), remaining text returned clean
    - **Validates: Requirements 7.2, 7.5**

  - [x]* 4.4 Write property test for invalid sticker ID resolution (Property 6)
    - **Property 6: Invalid sticker IDs resolve to null gracefully**
    - Generate random string IDs not in the registry
    - Verify `getById` returns null for all non-existent entries
    - **Validates: Requirements 7.6**

- [x] 5. Implement prompt processor and input validation
  - [x] 5.1 Implement buildPrompt utility with history truncation
    - Create `src/lib/build-prompt.ts`
    - Accept system prompt, history array, user message, and maxHistoryMessages (20)
    - Truncate history from front (oldest removed first), preserve order
    - Always include system prompt as systemInstruction
    - Append current user message as final entry
    - Return structured `GeminiRequest` object with generationConfig (maxOutputTokens: 256, temperature: 0.9, topP: 0.95, topK: 40)
    - _Requirements: 1.4, 4.2, 5.2, 5.4, 5.6_

  - [x]* 5.2 Write property test for history truncation (Property 4)
    - **Property 4: History truncation preserves recency and order (max 20)**
    - Generate message arrays of length 0-100
    - Verify exactly min(N, 20) messages included, they are the most recent, order preserved, system prompt always present
    - **Validates: Requirements 1.4, 4.2, 5.2, 5.4, 5.6**

  - [x] 5.3 Implement input validator
    - Create `src/lib/input-validator.ts`
    - Reject whitespace-only strings (spaces, tabs, newlines, Unicode whitespace)
    - Accept strings with at least one non-whitespace character
    - Enforce 2000 character maximum length
    - _Requirements: 3.4, 3.1_

  - [x]* 5.4 Write property test for whitespace-only input rejection (Property 3)
    - **Property 3: Whitespace-only input rejection**
    - Generate whitespace-only strings (various Unicode whitespace) and non-whitespace strings
    - Verify whitespace-only → rejected, non-whitespace → accepted
    - **Validates: Requirements 3.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement API route handler
  - [x] 7.1 Create /api/chat route handler
    - Create `src/app/api/chat/route.ts`
    - Accept POST with `{ message, history }` body
    - Read system prompt from environment variable
    - Call `buildPrompt` to construct Gemini request
    - Call Google Gemini API (`@google/generative-ai` SDK)
    - Parse response, extract sticker via sticker parser
    - Return `{ text, stickerId? }` JSON response
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

  - [x] 7.2 Implement error handling in API route
    - Handle timeout (10s) → return 504 with retryable: true and Abhijeet-style message
    - Handle rate limit (429) → return 429 with retryable: true and Abhijeet-style message
    - Handle Gemini 5xx → return 502 with retryable: true
    - Handle invalid API key → log error, return 500 with retryable: false
    - Handle malformed Gemini response → return generic error in Abhijeet's style
    - _Requirements: 5.3, 5.5, 6.1_

  - [x]* 7.3 Write unit tests for API route handler
    - Mock Gemini API responses (success, timeout, 429, 5xx, malformed)
    - Verify correct JSON output structure for each scenario
    - Verify error messages are in Abhijeet's conversational style
    - _Requirements: 5.3, 5.5_

- [x] 8. Implement chat interface frontend
  - [x] 8.1 Create ChatPage component with message display
    - Create `src/app/page.tsx` as the main chat page
    - Create `src/components/ChatBubble.tsx` for individual messages
    - Display "Abhijeet" in header
    - Render user messages right-aligned, bot messages left-aligned with distinct styling
    - Auto-scroll to latest message
    - Support viewports from 320px width and above using Tailwind responsive classes
    - _Requirements: 3.1, 3.6, 3.7_

  - [x] 8.2 Implement message input and session state management
    - Create `src/components/ChatInput.tsx` with text input (maxLength 2000) and send button
    - Manage `ChatState` (messages, isLoading, error) in React useState
    - Submit on Enter key or send button click
    - Validate input (reject empty/whitespace-only via input-validator)
    - Append user message to display within 200ms
    - Show loading indicator during API call
    - Session resets on page refresh (state in memory only)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.3, 4.4_

  - [x] 8.3 Implement API integration and error display
    - POST to `/api/chat` with message and last 20 messages from history
    - On success: append bot response to messages, render sticker if present
    - On error: display error message in Abhijeet's style, show retry button
    - Hide loading indicator on response or error
    - Handle 30-second client-side timeout
    - _Requirements: 3.3, 3.5, 5.3, 5.4, 5.5_

  - [x] 8.4 Implement sticker renderer component
    - Create `src/components/StickerImage.tsx`
    - Render sticker images inline at max 200×200px
    - Handle image load errors gracefully (hide image, show text only)
    - Use `onError` handler to silently fall back
    - _Requirements: 7.3, 7.6_

  - [x]* 8.5 Write unit tests for chat components
    - Test initial empty state renders correctly
    - Test message append updates display
    - Test loading indicator shows/hides
    - Test whitespace-only input is rejected
    - Test sticker image fallback on error
    - _Requirements: 3.3, 3.4, 7.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integration wiring and deployment configuration
  - [x] 10.1 Wire all components together and configure environment
    - Create `.env.local.example` with required environment variables (GEMINI_API_KEY, SYSTEM_PROMPT, NEXT_PUBLIC_APP_NAME)
    - Ensure API route imports and uses buildPrompt, sticker-parser, sticker-registry
    - Ensure frontend imports and uses input-validator, sticker renderer
    - Verify all imports resolve and application builds without errors
    - _Requirements: 6.2, 6.3_

  - [x] 10.2 Configure Vercel deployment settings
    - Create `vercel.json` if needed for any custom configuration
    - Ensure build completes within Vercel constraints
    - Verify static assets (stickers) are served from `/public/stickers/`
    - Add placeholder sticker images (WebP/PNG, ≤512KB each) for at least 5 stickers
    - _Requirements: 6.1, 6.4, 6.5, 7.4_

  - [x]* 10.3 Write integration tests for end-to-end chat flow
    - Mock Gemini API, send message, verify response appears in UI
    - Verify session reset on simulated page refresh
    - Verify responsive layout at 320px, 768px, 1024px viewports
    - _Requirements: 3.1, 3.5, 3.6, 4.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The system prompt builder (tasks 2.1–2.4) is a build-time utility run once during development; its output is stored as an environment variable
- Sticker placeholder images should be added during task 10.2; real sticker assets can be swapped in later
- All API error messages must be written in Abhijeet's conversational style (Hinglish, casual tone)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "5.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.1", "5.1", "5.4"] },
    { "id": 4, "tasks": ["2.4", "4.2", "5.2"] },
    { "id": 5, "tasks": ["2.5", "4.3", "4.4"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2"] },
    { "id": 8, "tasks": ["7.3", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.4"] },
    { "id": 10, "tasks": ["8.3"] },
    { "id": 11, "tasks": ["8.5", "10.1"] },
    { "id": 12, "tasks": ["10.2"] },
    { "id": 13, "tasks": ["10.3"] }
  ]
}
```
