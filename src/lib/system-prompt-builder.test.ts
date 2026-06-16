import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  estimateTokens,
  MAX_TOKEN_BUDGET,
  type SystemPromptInput,
} from "./system-prompt-builder";
import type { PersonalityProfile } from "./personality-processor";
import type { ChatLogAnalysis } from "./chat-log-parser";

function createMockPersonality(
  overrides: Partial<PersonalityProfile> = {}
): PersonalityProfile {
  return {
    toneDescriptors: ["casual", "friendly", "sarcastic"],
    sentencePatterns: ["short messages", "fragmented sentences"],
    greetingHabits: ["yo", "kya hal"],
    humorStyle: "dry sarcasm with self-deprecating jokes",
    catchphrases: ["Tnsn not", "Ezzz", "Dang", "Yeaaaa", "Oouuuu"],
    emojiUsage: { "😂": 15, "🔥": 8, "💀": 5 },
    abbreviations: { av: "abhi", bt: "but", h: "hai", n: "na", fr: "phir" },
    passionTopics: ["cricket", "gaming", "music", "tech"],
    avoidanceTopics: ["politics", "religion"],
    ...overrides,
  };
}

function createMockChatAnalysis(
  overrides: Partial<ChatLogAnalysis> = {}
): ChatLogAnalysis {
  return {
    frequentPhrases: ["kya hal", "chal theek", "haan bhai", "acha ok"],
    vocabularyPatterns: ["bhai", "yaar", "chal", "theek"],
    messageLength: { avg: 45, p90: 120 },
    emojiFrequency: { "😂": 20, "🔥": 10 },
    ...overrides,
  };
}

describe("system-prompt-builder", () => {
  describe("estimateTokens", () => {
    it("estimates tokens as characters / 4", () => {
      expect(estimateTokens("abcd")).toBe(1);
      expect(estimateTokens("abcde")).toBe(2); // ceil(5/4) = 2
      expect(estimateTokens("")).toBe(0);
      expect(estimateTokens("a".repeat(100))).toBe(25);
    });
  });

  describe("buildSystemPrompt", () => {
    it("includes the header identifying Abhijeet", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "laugh: funny, lol\ncool: nice, awesome",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain(
        "You are Abhijeet. You are chatting with your friends on WhatsApp."
      );
    });

    it("includes personality section with tone and humor", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("PERSONALITY:");
      expect(prompt).toContain("casual");
      expect(prompt).toContain("dry sarcasm with self-deprecating jokes");
    });

    it("includes language rules with abbreviations", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("LANGUAGE RULES:");
      expect(prompt).toContain("Hinglish");
      expect(prompt).toContain("av=abhi");
      expect(prompt).toContain("max 300 chars");
      expect(prompt).toContain("Never use bullet points");
    });

    it("includes catchphrases", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("CATCHPHRASES:");
      expect(prompt).toContain('"Tnsn not"');
      expect(prompt).toContain('"Ezzz"');
    });

    it("includes sticker section with keywords", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "laugh: funny, lol\ncool: nice, awesome",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("STICKERS:");
      expect(prompt).toContain("laugh: funny, lol");
      expect(prompt).toContain("[STICKER:id]");
      expect(prompt).toContain("Max 1 sticker per message");
    });

    it("includes topics section", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("TOPICS:");
      expect(prompt).toContain("cricket");
      expect(prompt).toContain("gaming");
      expect(prompt).toContain("politics");
    });

    it("includes style examples when provided", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        styleExamples: [
          "bhai kya scene h aaj",
          "chal theek h fr milte h",
          "Ezzz bro 🔥",
        ],
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("STYLE EXAMPLES:");
      expect(prompt).toContain("bhai kya scene h aaj");
    });

    it("includes frequent phrases from chat analysis", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis({
          frequentPhrases: ["kya hal", "chal theek", "haan bhai"],
        }),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("FREQUENT PHRASES:");
      expect(prompt).toContain("kya hal");
    });

    it("stays within 8000 token budget", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "laugh: funny, lol\ncool: nice, awesome",
      };

      const prompt = buildSystemPrompt(input);
      const tokens = estimateTokens(prompt);
      expect(tokens).toBeLessThanOrEqual(MAX_TOKEN_BUDGET);
    });

    it("truncates style examples when they would exceed budget", () => {
      // Create very long style examples that would exceed budget
      const longExamples = Array.from({ length: 50 }, (_, i) =>
        `This is a very long style example number ${i} that contains a lot of text to simulate a real message from the chat logs with plenty of content ${"x".repeat(200)}`
      );

      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis({
          frequentPhrases: Array.from({ length: 100 }, (_, i) =>
            `phrase number ${i} that is somewhat long`
          ),
        }),
        styleExamples: longExamples,
        stickerKeywords: "laugh: funny\ncool: nice\nangry: mad\nsad: cry\nlove: heart",
      };

      const prompt = buildSystemPrompt(input);
      const tokens = estimateTokens(prompt);
      expect(tokens).toBeLessThanOrEqual(MAX_TOKEN_BUDGET);
    });

    it("handles empty personality profile gracefully", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality({
          toneDescriptors: [],
          sentencePatterns: [],
          greetingHabits: [],
          humorStyle: "",
          catchphrases: [],
          emojiUsage: {},
          abbreviations: {},
          passionTopics: [],
          avoidanceTopics: [],
        }),
        chatAnalysis: createMockChatAnalysis({
          frequentPhrases: [],
          vocabularyPatterns: [],
          emojiFrequency: {},
        }),
        stickerKeywords: "",
      };

      const prompt = buildSystemPrompt(input);
      expect(prompt).toContain("You are Abhijeet");
      expect(prompt).toContain("PERSONALITY:");
      expect(prompt).toContain("LANGUAGE RULES:");
      const tokens = estimateTokens(prompt);
      expect(tokens).toBeLessThanOrEqual(MAX_TOKEN_BUDGET);
    });

    it("outputs a string suitable for environment variable storage", () => {
      const input: SystemPromptInput = {
        personality: createMockPersonality(),
        chatAnalysis: createMockChatAnalysis(),
        stickerKeywords: "laugh: funny, lol",
      };

      const prompt = buildSystemPrompt(input);
      // Should be a non-empty string
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
      // Should not contain null bytes or other problematic characters
      expect(prompt).not.toContain("\0");
    });
  });
});
