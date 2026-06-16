/**
 * Sticker response parser for the Abhijeet Chatbot.
 * Parses LLM response text for [STICKER:id] patterns and extracts
 * at most one sticker identifier (the first match).
 */

export interface StickerParseResult {
  text: string; // cleaned text with all [STICKER:x] tags removed
  stickerId?: string; // first sticker ID found, or undefined if none
}

const STICKER_PATTERN = /\[STICKER:([^\]]+)\]/g;

/**
 * Parse an LLM response text for sticker tags.
 * - Extracts at most one sticker identifier (the first match if multiple exist)
 * - Returns cleaned text with all [STICKER:x] tags removed
 * - Trims the resulting text
 */
export function parseStickerResponse(responseText: string): StickerParseResult {
  let stickerId: string | undefined;

  // Find the first match to extract the sticker ID
  const firstMatch = responseText.match(/\[STICKER:([^\]]+)\]/);
  if (firstMatch) {
    stickerId = firstMatch[1];
  }

  // Remove all sticker tags from the text
  const cleanedText = responseText.replace(STICKER_PATTERN, "").trim();

  return {
    text: cleanedText,
    ...(stickerId !== undefined && { stickerId }),
  };
}
