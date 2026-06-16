/**
 * System prompt builder.
 * Combines personality profile + chat log analysis into a system prompt
 * following the template structure from the design document.
 * Enforces an 8000 token budget (1 token ≈ 4 characters).
 */

import type { PersonalityProfile } from "./personality-processor";
import type { ChatLogAnalysis } from "./chat-log-parser";
import { getKeywordList } from "./sticker-registry";

/** Maximum token budget for the system prompt. */
export const MAX_TOKEN_BUDGET = 8000;

/** Approximate characters per token. */
const CHARS_PER_TOKEN = 4;

/** Maximum character budget derived from token budget. */
const MAX_CHAR_BUDGET = MAX_TOKEN_BUDGET * CHARS_PER_TOKEN;

export interface SystemPromptInput {
  personality: PersonalityProfile;
  chatAnalysis: ChatLogAnalysis;
  /** Optional style examples (real messages from chat logs). */
  styleExamples?: string[];
  /** Optional sticker keyword list override (for testing). */
  stickerKeywords?: string;
}

/**
 * Estimate token count for a string (1 token ≈ 4 characters).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Build the system prompt from personality profile and chat log analysis.
 * Enforces the 8000 token budget by truncating style examples and frequent phrases first.
 *
 * @param input - Personality profile, chat analysis, and optional style examples
 * @returns Final system prompt string suitable for storage as environment variable
 */
export function buildSystemPrompt(input: SystemPromptInput): string {
  const { personality, chatAnalysis, styleExamples, stickerKeywords } = input;

  // Get sticker keywords (use override for testing, or fetch from registry)
  const stickerList = stickerKeywords ?? getKeywordList();

  // Build the core sections that are always included
  const header = buildHeader();
  const personalitySection = buildPersonalitySection(personality);
  const languageRules = buildLanguageRulesSection(personality);
  const catchphrasesSection = buildCatchphrasesSection(personality);
  const stickerSection = buildStickerSection(stickerList);
  const topicsSection = buildTopicsSection(personality);

  // Core prompt without truncatable sections
  const corePrompt = [
    header,
    personalitySection,
    languageRules,
    catchphrasesSection,
    stickerSection,
    topicsSection,
  ].join("\n\n");

  const coreTokens = estimateTokens(corePrompt);
  const remainingBudget = MAX_TOKEN_BUDGET - coreTokens;

  if (remainingBudget <= 0) {
    // Core prompt already exceeds budget — truncate it to fit
    return truncateToTokenBudget(corePrompt);
  }

  // Build truncatable sections: style examples and frequent phrases
  const styleSection = buildStyleExamplesSection(
    styleExamples || [],
    chatAnalysis.frequentPhrases,
    remainingBudget
  );

  const fullPrompt = styleSection
    ? corePrompt + "\n\n" + styleSection
    : corePrompt;

  // Final safety check
  if (estimateTokens(fullPrompt) > MAX_TOKEN_BUDGET) {
    return truncateToTokenBudget(fullPrompt);
  }

  return fullPrompt;
}

function buildHeader(): string {
  return "You are Abhijeet. You are chatting with your friends on WhatsApp.";
}

function buildPersonalitySection(personality: PersonalityProfile): string {
  const lines: string[] = ["PERSONALITY:"];

  if (personality.toneDescriptors.length > 0) {
    lines.push(`- Tone: ${personality.toneDescriptors.slice(0, 5).join(", ")}`);
  }

  if (personality.humorStyle) {
    lines.push(`- Humor: ${personality.humorStyle}`);
  }

  if (personality.sentencePatterns.length > 0) {
    lines.push(
      `- Communication: ${personality.sentencePatterns.slice(0, 3).join("; ")}`
    );
  }

  if (personality.greetingHabits.length > 0) {
    lines.push(
      `- Greetings: ${personality.greetingHabits.slice(0, 3).join(", ")}`
    );
  }

  return lines.join("\n");
}

function buildLanguageRulesSection(personality: PersonalityProfile): string {
  const lines: string[] = ["LANGUAGE RULES:"];
  lines.push("- Default: Hinglish (Hindi-English mix)");

  // Include abbreviations from personality profile
  if (Object.keys(personality.abbreviations).length > 0) {
    const abbrEntries = Object.entries(personality.abbreviations)
      .slice(0, 10)
      .map(([abbr, meaning]) => `${abbr}=${meaning}`);
    lines.push(`- Use abbreviations: ${abbrEntries.join(", ")}`);
  }

  lines.push("- Keep messages short (1-2 lines, max 300 chars)");
  lines.push("- Use emojis sparingly");
  lines.push(
    "- Never use bullet points, formal language, or AI references"
  );

  // Include top emojis if available
  const topEmojis = Object.keys(personality.emojiUsage).slice(0, 5);
  if (topEmojis.length > 0) {
    lines.push(`- Preferred emojis: ${topEmojis.join(" ")}`);
  }

  return lines.join("\n");
}

function buildCatchphrasesSection(personality: PersonalityProfile): string {
  if (personality.catchphrases.length === 0) {
    return 'CATCHPHRASES: (none identified)';
  }

  const phrases = personality.catchphrases
    .slice(0, 10)
    .map((p) => `"${p}"`)
    .join(", ");

  return `CATCHPHRASES: ${phrases}`;
}

function buildStickerSection(stickerKeywords: string): string {
  const lines: string[] = ["STICKERS:"];

  if (stickerKeywords.trim().length > 0) {
    lines.push(stickerKeywords);
  }

  lines.push(
    "Format: Include [STICKER:id] at the end of your message when appropriate."
  );
  lines.push("Max 1 sticker per message.");

  return lines.join("\n");
}

function buildTopicsSection(personality: PersonalityProfile): string {
  const lines: string[] = ["TOPICS:"];

  if (personality.passionTopics.length > 0) {
    lines.push(
      `- Passionate about: ${personality.passionTopics.slice(0, 8).join(", ")}`
    );
  } else {
    lines.push("- Passionate about: general conversation");
  }

  lines.push("- Deflect/humor for: unknown topics");

  if (personality.avoidanceTopics.length > 0) {
    lines.push(
      `- Never discuss: ${personality.avoidanceTopics.slice(0, 5).join(", ")}`
    );
  } else {
    lines.push("- Never discuss: nothing specific");
  }

  return lines.join("\n");
}

/**
 * Build the style examples section, fitting within the remaining token budget.
 * Truncates examples and frequent phrases if they exceed the budget.
 */
function buildStyleExamplesSection(
  styleExamples: string[],
  frequentPhrases: string[],
  remainingTokenBudget: number
): string | null {
  if (styleExamples.length === 0 && frequentPhrases.length === 0) {
    return null;
  }

  // Reserve some tokens for the section header and formatting
  const headerOverhead = estimateTokens("STYLE EXAMPLES:\n\nFREQUENT PHRASES: ");
  let availableTokens = remainingTokenBudget - headerOverhead;

  if (availableTokens <= 0) {
    return null;
  }

  const parts: string[] = [];

  // Add style examples first (more valuable)
  if (styleExamples.length > 0) {
    const examplesHeader = "STYLE EXAMPLES:";
    let examplesContent = examplesHeader;

    for (const example of styleExamples.slice(0, 5)) {
      const line = `\n- "${example}"`;
      const lineTokens = estimateTokens(line);

      if (availableTokens - lineTokens < 0) {
        break;
      }

      examplesContent += line;
      availableTokens -= lineTokens;
    }

    if (examplesContent !== examplesHeader) {
      parts.push(examplesContent);
    }
  }

  // Add frequent phrases with remaining budget
  if (frequentPhrases.length > 0 && availableTokens > 10) {
    const phrasesHeader = "FREQUENT PHRASES:";
    let phrasesContent = phrasesHeader;

    const phrasesToInclude = frequentPhrases.slice(0, 20);
    for (const phrase of phrasesToInclude) {
      const addition = ` "${phrase}",`;
      const additionTokens = estimateTokens(addition);

      if (availableTokens - additionTokens < 0) {
        break;
      }

      phrasesContent += addition;
      availableTokens -= additionTokens;
    }

    if (phrasesContent !== phrasesHeader) {
      // Remove trailing comma
      phrasesContent = phrasesContent.replace(/,$/, "");
      parts.push(phrasesContent);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Truncate a prompt string to fit within the token budget.
 * Cuts from the end, preserving complete lines where possible.
 */
function truncateToTokenBudget(prompt: string): string {
  const maxChars = MAX_CHAR_BUDGET;

  if (prompt.length <= maxChars) {
    return prompt;
  }

  // Cut to max chars, then find the last newline to avoid cutting mid-line
  let truncated = prompt.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");

  if (lastNewline > maxChars * 0.8) {
    truncated = truncated.substring(0, lastNewline);
  }

  return truncated;
}
