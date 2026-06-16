# Requirements Document

## Introduction

Abhijeet Chatbot is a personalized AI-powered web application that mimics the personality, writing style, and thinking patterns of Abhijeet. The chatbot uses a personality analysis report and WhatsApp chat logs as data sources to replicate Abhijeet's communication style — including his use of emojis, slang, humor, and conversational patterns. The target audience is Abhijeet's friends, who can interact with the chatbot through a publicly accessible web interface without authentication. The system prioritizes low-cost deployment on Vercel with stateless (session-fresh) conversations.

## Glossary

- **Chatbot**: The AI-powered conversational agent that mimics Abhijeet's personality and communication style
- **Personality_Profile**: The structured representation of Abhijeet's personality traits, communication patterns, and behavioral tendencies derived from the personality analysis report and chat logs
- **Chat_Interface**: The web-based frontend where users type messages and receive responses from the Chatbot
- **System_Prompt**: The instruction set provided to the LLM that defines how the Chatbot should behave, including personality traits and communication style
- **Chat_Logs**: Exported WhatsApp conversation data used to extract Abhijeet's writing patterns, vocabulary, and conversational style
- **Personality_Report**: The PDF/DOCX document containing Abhijeet's personality and behavioral analysis
- **LLM_Backend**: The Google Gemini API (Gemini 1.5 Flash) used for generating responses on the free tier
- **Session**: A single conversation between a user and the Chatbot, with no memory carried between sessions
- **User**: A friend of Abhijeet who interacts with the Chatbot through the Chat_Interface

## Requirements

### Requirement 1: Personality-Driven Response Generation

**User Story:** As a User, I want the Chatbot to respond like Abhijeet, so that I feel like I'm chatting with him.

#### Acceptance Criteria

1. WHEN a User sends a message, THE Chatbot SHALL generate a response that incorporates at least two of the following personality markers defined in the Personality_Profile: humor style, opinion tendencies, conversation topics, emotional tone, and catchphrases
2. THE Chatbot SHALL include emojis, slang, and informal language patterns extracted from the Chat_Logs, using at least one emoji or slang term per response where contextually relevant
3. WHEN the Chatbot receives a query about a topic not covered in the Personality_Profile or Chat_Logs, THE Chatbot SHALL either fabricate a plausible in-character response or deflect using humor patterns found in the Chat_Logs
4. THE Chatbot SHALL maintain persona consistency throughout a single Session by not contradicting previously stated opinions, preferences, or facts from the Personality_Profile within that Session
5. THE Chatbot SHALL generate responses in Hinglish (Hindi-English mix) for at least 80% of messages, switching to the User's language only when the User sends three or more consecutive messages in a language other than Hinglish
6. THE Chatbot SHALL generate responses within a maximum length of 300 characters per message, consistent with casual chat message patterns observed in the Chat_Logs
7. IF a User sends a message containing harmful, abusive, or inappropriate content, THEN THE Chatbot SHALL deflect or refuse in a manner consistent with Abhijeet's personality without generating harmful content

### Requirement 2: Personality Data Ingestion

**User Story:** As a developer, I want to process Abhijeet's personality report and chat logs into a usable format, so that the Chatbot can accurately replicate his style.

#### Acceptance Criteria

1. WHEN the Personality_Report is provided, THE System SHALL extract personality traits, communication patterns, and behavioral tendencies into the Personality_Profile, including at minimum: tone descriptors, sentence structure preferences, greeting and sign-off habits, and humor style
2. WHEN WhatsApp Chat_Logs are provided in exported text format, THE System SHALL parse and extract Abhijeet's messages, vocabulary patterns, phrases appearing 3 or more times across the logs, and emoji usage frequency
3. THE System SHALL combine extracted data from the Personality_Report and Chat_Logs into a single System_Prompt that instructs the LLM_Backend on Abhijeet's persona and does not exceed 8000 tokens in length
4. IF the Chat_Logs contain messages from multiple participants, THEN THE System SHALL identify Abhijeet's messages by matching the sender name field in the WhatsApp export format and extract only those messages for style analysis
5. IF the Personality_Report or Chat_Logs are empty or cannot be parsed, THEN THE System SHALL report an error message indicating which input source failed and the reason for the failure
6. IF the Chat_Logs contain fewer than 10 messages from Abhijeet, THEN THE System SHALL report a warning indicating insufficient data for reliable style extraction

### Requirement 3: Web-Based Chat Interface

**User Story:** As a User, I want to access the Chatbot through a simple web page, so that I can chat with it easily from any device.

#### Acceptance Criteria

1. THE Chat_Interface SHALL provide a text input field for Users to type messages (maximum 2000 characters) and a display area showing the conversation history within the current Session, where a Session starts when the page loads and resets on page refresh
2. THE Chat_Interface SHALL be accessible without authentication or login
3. WHEN a User submits a message via the send button or by pressing Enter, THE Chat_Interface SHALL append the message to the conversation display within 200 milliseconds and show a loading indicator until the Chatbot response is received or an error occurs
4. IF the User attempts to submit an empty or whitespace-only message, THEN THE Chat_Interface SHALL not send the message and SHALL keep the input field focused
5. IF the Chatbot fails to return a response within 30 seconds or returns an error, THEN THE Chat_Interface SHALL hide the loading indicator and display an error message indicating the response could not be generated, allowing the User to retry
6. THE Chat_Interface SHALL be functional on viewports from 320px width and above, supporting the latest two major versions of Chrome, Firefox, Safari, and Edge on both desktop and mobile
7. THE Chat_Interface SHALL display the chatbot's name as "Abhijeet" in the header or message area, with chatbot messages visually distinct from User messages through different alignment or background styling

### Requirement 4: Stateless Session Management

**User Story:** As a User, I want each conversation to start fresh, so that the Chatbot does not reference previous interactions I may have forgotten.

#### Acceptance Criteria

1. WHEN a User opens the Chat_Interface, THE Chatbot SHALL start a new Session with an empty conversation history and SHALL NOT include any messages or context from previous Sessions in requests sent to the LLM
2. WHILE a Session is active, THE Chatbot SHALL include all messages exchanged during that Session as context in each subsequent request to the LLM
3. WHEN a User refreshes the page, closes the browser tab, or navigates away from the Chat_Interface, THE Chatbot SHALL discard all conversation context, and any subsequent interaction SHALL begin as a new Session with no prior messages displayed and no previous context sent to the LLM
4. WHEN a new Session starts, THE Chatbot SHALL display no previous messages in the Chat_Interface and SHALL NOT produce responses that reference content from any prior Session

### Requirement 5: Cost-Optimized LLM Integration

**User Story:** As a developer, I want to use the most cost-effective LLM backend, so that running the Chatbot remains affordable for a personal project.

#### Acceptance Criteria

1. THE LLM_Backend SHALL use the Google Gemini API free tier (Gemini 1.5 Flash) as the primary model for response generation
2. THE System SHALL send the System_Prompt containing the Personality_Profile with each request to the LLM_Backend
3. IF the LLM_Backend returns an error or is unavailable after a timeout of 10 seconds, THEN THE Chatbot SHALL display an error message to the User written in Abhijeet's conversational style as defined in the Personality_Profile, indicating that the Chatbot is temporarily unable to respond
4. THE System SHALL limit conversation context sent to the LLM_Backend to a maximum of 20 most recent messages from the current Session to stay within token limits
5. IF the LLM_Backend returns a rate limit error (HTTP 429), THEN THE Chatbot SHALL display a message to the User in Abhijeet's style indicating the Chatbot needs a short break, without exposing technical details
6. WHILE the conversation context exceeds 20 messages, THE System SHALL truncate the oldest User and Chatbot messages while always preserving the System_Prompt in the request

### Requirement 6: Deployment on Vercel

**User Story:** As a developer, I want to deploy the Chatbot on Vercel, so that it is publicly accessible at zero or minimal hosting cost.

#### Acceptance Criteria

1. WHEN the developer triggers a deployment, THE System SHALL complete the Vercel build and deploy process without errors, with all serverless API routes responding within the Vercel Hobby plan execution timeout of 10 seconds per invocation
2. THE System SHALL use Next.js with API routes as the framework for both frontend rendering and backend Gemini API calls
3. THE System SHALL store the System_Prompt and configuration values as Vercel environment variables, accessible to serverless functions at runtime without requiring a database or external configuration service
4. WHEN deployed, THE Chat_Interface SHALL be accessible via the public Vercel-assigned URL, returning an HTTP 200 response and rendering the chat interface without requiring additional infrastructure or paid services
5. THE System SHALL serve all static assets including sticker images via Vercel's static file hosting, with each asset loading successfully when the Chat_Interface is accessed

### Requirement 7: Custom Sticker Responses

**User Story:** As a User, I want the Chatbot to send custom sticker images in conversation, so that the chat feels more expressive and authentic to how Abhijeet communicates.

#### Acceptance Criteria

1. THE System SHALL support a defined set of at least 5 and at most 50 custom sticker images, each with associated metadata containing one or more mood or trigger keywords used for selection
2. WHEN the Chatbot's LLM response includes a sticker identifier that matches a sticker in the defined set, THE Chatbot SHALL include that sticker image in the response, limited to at most 1 sticker per response message
3. THE Chat_Interface SHALL render sticker images inline within the conversation at a maximum display size of 200×200 pixels, positioned as a distinct message bubble or within the same bubble as accompanying text
4. THE System SHALL store sticker images as static assets within the deployment in PNG or WebP format, each not exceeding 512 KB in file size
5. WHEN the Chatbot sends a sticker, THE Chatbot SHALL optionally accompany the sticker with a text message of no more than 150 characters, where the decision to include text is determined by the LLM based on conversation context
6. IF a sticker identifier referenced by the LLM does not correspond to any sticker in the defined set or the sticker asset fails to load, THEN THE Chat_Interface SHALL display the text-only response without the sticker and without showing an error to the user

### Requirement 8: Response Quality and Style Fidelity

**User Story:** As a User, I want the Chatbot's responses to feel authentic, so that the conversation is entertaining and believable.

#### Acceptance Criteria

1. THE Chatbot SHALL generate responses with a word count between 5 and 80 words for casual messages and between 20 and 200 words for passion-topic responses, matching Abhijeet's typical message length distribution as observed in the Chat_Logs
2. THE Chatbot SHALL use code-switching and Hinglish (Hindi-English mixing) as the default communication style, including at least one Hindi word or phrase per response on average, matching the frequency and placement patterns observed in the Chat_Logs
3. WHEN asked about topics Abhijeet is passionate about as listed in the Personality_Profile, THE Chatbot SHALL respond with longer messages (at least 20 words), include topic-specific vocabulary from the Chat_Logs, and use expressive punctuation or slang consistent with the Personality_Profile
4. WHEN asked personal questions, THE Chatbot SHALL respond according to Abhijeet's openness level as defined in the Personality_Profile: sharing details freely for high-openness topics, giving brief or deflecting answers for low-openness topics, and declining or redirecting for restricted topics
5. THE Chatbot SHALL NOT use bullet points, numbered lists, formal greetings (e.g., "Dear", "Regards"), meta-references to being an AI (e.g., "As an AI"), or structured formatting in responses
6. THE Chatbot SHALL use informal language including abbreviations, lowercase text, and casual punctuation patterns consistent with WhatsApp messaging style as observed in the Chat_Logs
