/**
 * Personality report processor.
 * Extracts structured personality data from the personality analysis report text.
 * This is a build-time utility — its output feeds into the system prompt builder.
 */

export interface PersonalityProfile {
  toneDescriptors: string[];
  sentencePatterns: string[];
  greetingHabits: string[];
  humorStyle: string;
  catchphrases: string[];
  emojiUsage: Record<string, number>;
  abbreviations: Record<string, string>;
  passionTopics: string[];
  avoidanceTopics: string[];
}

/**
 * Process raw personality report text into a structured PersonalityProfile.
 *
 * @param reportText - Raw text content extracted from the personality report (PDF/DOCX)
 * @returns Structured PersonalityProfile object
 * @throws Error if the report text is empty or cannot be parsed
 */
export function processPersonalityReport(reportText: string): PersonalityProfile {
  if (!reportText || reportText.trim().length === 0) {
    throw new Error(
      'Personality report is empty. Please provide valid report content.'
    );
  }

  const normalizedText = reportText.replace(/\r\n/g, '\n');

  const toneDescriptors = extractToneDescriptors(normalizedText);
  const sentencePatterns = extractSentencePatterns(normalizedText);
  const greetingHabits = extractGreetingHabits(normalizedText);
  const humorStyle = extractHumorStyle(normalizedText);
  const catchphrases = extractCatchphrases(normalizedText);
  const emojiUsage = extractEmojiUsage(normalizedText);
  const abbreviations = extractAbbreviations(normalizedText);
  const passionTopics = extractPassionTopics(normalizedText);
  const avoidanceTopics = extractAvoidanceTopics(normalizedText);

  return {
    toneDescriptors,
    sentencePatterns,
    greetingHabits,
    humorStyle,
    catchphrases,
    emojiUsage,
    abbreviations,
    passionTopics,
    avoidanceTopics,
  };
}

/**
 * Extract tone descriptors from the report.
 * Looks for sections about tone, communication style, personality traits.
 */
function extractToneDescriptors(text: string): string[] {
  const descriptors: string[] = [];

  // Look for tone/communication style section
  const toneSection = extractSection(text, [
    'tone',
    'communication style',
    'personality traits',
    'conversational tone',
    'speaking style',
  ]);

  if (toneSection) {
    const items = extractListItems(toneSection);
    descriptors.push(...items);
  }

  // Also look for adjectives describing communication
  const tonePatterns = [
    /(?:tone|style|manner)\s*(?:is|:)\s*([^\n.]+)/gi,
    /(?:communicates?|speaks?|talks?)\s+(?:in\s+a?\s*)?([^\n.]+)/gi,
    /(?:casual|informal|formal|sarcastic|witty|humorous|dry|warm|friendly|blunt|direct|playful|energetic|laid-?back|chill)/gi,
  ];

  for (const pattern of tonePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const descriptor = (match[1] || match[0]).trim().toLowerCase();
      if (descriptor.length > 2 && descriptor.length < 50 && !descriptors.includes(descriptor)) {
        descriptors.push(descriptor);
      }
    }
  }

  return deduplicateAndClean(descriptors).slice(0, 15);
}

/**
 * Extract sentence patterns from the report.
 * Looks for information about how sentences are structured.
 */
function extractSentencePatterns(text: string): string[] {
  const patterns: string[] = [];

  const sentenceSection = extractSection(text, [
    'sentence',
    'message structure',
    'writing pattern',
    'message pattern',
    'text pattern',
    'messaging style',
  ]);

  if (sentenceSection) {
    const items = extractListItems(sentenceSection);
    patterns.push(...items);
  }

  // Look for sentence structure descriptions
  const structurePatterns = [
    /(?:sentences?\s+(?:are|tend to be))\s+([^\n.]+)/gi,
    /(?:messages?\s+(?:are|tend to be))\s+([^\n.]+)/gi,
    /(?:uses?\s+(?:short|long|fragmented|complete|incomplete))\s*([^\n.]*)/gi,
    /(?:prefers?\s+(?:short|long|one-?word|brief))\s*([^\n.]*)/gi,
  ];

  for (const pattern of structurePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const item = (match[1] || match[0]).trim();
      if (item.length > 2 && item.length < 100) {
        patterns.push(item);
      }
    }
  }

  return deduplicateAndClean(patterns).slice(0, 10);
}

/**
 * Extract greeting habits from the report.
 */
function extractGreetingHabits(text: string): string[] {
  const habits: string[] = [];

  const greetingSection = extractSection(text, [
    'greeting',
    'greet',
    'opening',
    'conversation starter',
    'hello',
    'sign-off',
    'sign off',
  ]);

  if (greetingSection) {
    const items = extractListItems(greetingSection);
    habits.push(...items);
  }

  // Look for greeting patterns
  const greetingPatterns = [
    /(?:greets?\s+(?:with|by|using))\s+([^\n.]+)/gi,
    /(?:opens?\s+(?:with|by|using))\s+([^\n.]+)/gi,
    /(?:greeting|hello|hi|hey|yo|sup|wassup|kya\s+hal)[^\n]*/gi,
    /(?:sign-?off|goodbye|bye|closing)\s*(?:with|:)\s*([^\n.]+)/gi,
  ];

  for (const pattern of greetingPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const item = (match[1] || match[0]).trim();
      if (item.length > 1 && item.length < 80) {
        habits.push(item);
      }
    }
  }

  return deduplicateAndClean(habits).slice(0, 10);
}

/**
 * Extract humor style description from the report.
 */
function extractHumorStyle(text: string): string {
  const humorSection = extractSection(text, [
    'humor',
    'humour',
    'jokes',
    'comedy',
    'funny',
    'sarcasm',
    'wit',
  ]);

  if (humorSection) {
    // Try to get a concise description
    const lines = humorSection.split('\n').filter((l) => l.trim().length > 0);
    const description = lines.slice(0, 3).join(' ').trim();
    if (description.length > 0) {
      return description.length > 200
        ? description.substring(0, 200).trim() + '...'
        : description;
    }
  }

  // Look for humor style mentions
  const humorPatterns = [
    /(?:humor|humour)\s*(?:style|type)?\s*(?:is|:)\s*([^\n.]+)/i,
    /(?:uses?\s+(?:sarcasm|irony|self-deprecat|dry humor|dark humor|wit))[^\n.]*/i,
    /(?:jokes?\s+(?:about|are|tend))\s*([^\n.]+)/i,
  ];

  for (const pattern of humorPatterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] || match[0]).trim();
    }
  }

  return 'casual and situational';
}

/**
 * Extract catchphrases from the report.
 */
function extractCatchphrases(text: string): string[] {
  const catchphrases: string[] = [];

  const catchphraseSection = extractSection(text, [
    'catchphrase',
    'catch phrase',
    'signature phrase',
    'frequent phrase',
    'common phrase',
    'pet phrase',
    'go-to phrase',
    'favorite expression',
    'favourite expression',
  ]);

  if (catchphraseSection) {
    const items = extractListItems(catchphraseSection);
    catchphrases.push(...items);
  }

  // Look for quoted phrases
  const quotedPhrases = text.matchAll(/[""]([^""]{2,50})[""]|"([^"]{2,50})"/g);
  for (const match of quotedPhrases) {
    const phrase = (match[1] || match[2]).trim();
    if (phrase.length >= 2 && phrase.length <= 50) {
      catchphrases.push(phrase);
    }
  }

  // Look for phrases marked as catchphrases or frequently used
  const phrasePatterns = [
    /(?:often\s+says?|frequently\s+(?:says?|uses?))\s+[""]?([^""\n.]+)[""]?/gi,
    /(?:catchphrase|signature)\s*(?:is|:)\s*[""]?([^""\n.]+)[""]?/gi,
  ];

  for (const pattern of phrasePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const phrase = (match[1] || match[0]).trim().replace(/^[""]|[""]$/g, '');
      if (phrase.length >= 2 && phrase.length <= 50) {
        catchphrases.push(phrase);
      }
    }
  }

  return deduplicateAndClean(catchphrases).slice(0, 20);
}

/**
 * Extract emoji usage patterns from the report.
 * Returns a map of emoji/description to relative frequency.
 */
function extractEmojiUsage(text: string): Record<string, number> {
  const emojiUsage: Record<string, number> = {};

  // Match actual emoji characters with context
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;

  const emojiMatches = text.matchAll(emojiRegex);
  for (const match of emojiMatches) {
    const emoji = match[0];
    emojiUsage[emoji] = (emojiUsage[emoji] || 0) + 1;
  }

  // Look for emoji descriptions in the report
  const emojiDescPatterns = [
    /(?:uses?\s+(?:the\s+)?)([\w\s]+)\s+emoji\s*(?:frequently|often|a lot)?/gi,
    /(?:emoji|emoticon)\s*(?:usage|preference|pattern)[^:]*:\s*([^\n]+)/gi,
  ];

  for (const pattern of emojiDescPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const desc = match[1].trim().toLowerCase();
      if (desc.length > 1 && desc.length < 30) {
        emojiUsage[desc] = (emojiUsage[desc] || 0) + 1;
      }
    }
  }

  // Sort by frequency and return top entries
  const sorted = Object.entries(emojiUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return Object.fromEntries(sorted);
}

/**
 * Extract abbreviations and their meanings from the report.
 */
function extractAbbreviations(text: string): Record<string, string> {
  const abbreviations: Record<string, string> = {};

  const abbrSection = extractSection(text, [
    'abbreviation',
    'shorthand',
    'short form',
    'slang',
    'texting style',
    'text speak',
  ]);

  if (abbrSection) {
    // Look for "abbr = meaning" or "abbr: meaning" or "abbr (meaning)" patterns
    const abbrPatterns = [
      /(\w{1,10})\s*[=:→]\s*([^\n,;]+)/g,
      /(\w{1,10})\s*\(([^)]+)\)/g,
      /[""](\w{1,10})[""]?\s*(?:means?|stands?\s+for|is\s+short\s+for)\s+[""]?([^""\n,;]+)/gi,
    ];

    for (const pattern of abbrPatterns) {
      const matches = abbrSection.matchAll(pattern);
      for (const match of matches) {
        const abbr = match[1].trim().toLowerCase();
        const meaning = match[2].trim();
        if (abbr.length >= 1 && abbr.length <= 10 && meaning.length > 0 && meaning.length < 50) {
          abbreviations[abbr] = meaning;
        }
      }
    }
  }

  // Also look for abbreviation patterns in the full text
  const globalAbbrPatterns = [
    /(?:uses?\s+)[""]?(\w{1,10})[""]?\s+(?:for|instead\s+of|to\s+mean)\s+[""]?([^""\n,;]+)/gi,
    /(\w{1,10})\s*=\s*([^\n,;]+)/g,
  ];

  for (const pattern of globalAbbrPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const abbr = match[1].trim().toLowerCase();
      const meaning = match[2].trim();
      if (abbr.length >= 1 && abbr.length <= 10 && meaning.length > 0 && meaning.length < 50) {
        abbreviations[abbr] = meaning;
      }
    }
  }

  return abbreviations;
}

/**
 * Extract passion topics from the report.
 */
function extractPassionTopics(text: string): string[] {
  const topics: string[] = [];

  const passionSection = extractSection(text, [
    'passion',
    'interest',
    'hobby',
    'hobbies',
    'loves',
    'enthusiastic',
    'favorite topic',
    'favourite topic',
    'talks about',
    'passionate about',
  ]);

  if (passionSection) {
    const items = extractListItems(passionSection);
    topics.push(...items);
  }

  // Look for passion topic mentions
  const passionPatterns = [
    /(?:passionate\s+about|loves?\s+(?:talking\s+about)?|enthusiastic\s+about|interested\s+in)\s+([^\n.]+)/gi,
    /(?:favorite|favourite)\s+(?:topics?|subjects?)\s*(?:include|are|:)\s*([^\n.]+)/gi,
    /(?:hobbies?|interests?)\s*(?:include|are|:)\s*([^\n.]+)/gi,
  ];

  for (const pattern of passionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const topicStr = match[1].trim();
      // Split by commas or "and"
      const splitTopics = topicStr.split(/,|\band\b/).map((t) => t.trim()).filter((t) => t.length > 1);
      topics.push(...splitTopics);
    }
  }

  return deduplicateAndClean(topics).slice(0, 15);
}

/**
 * Extract avoidance topics from the report.
 */
function extractAvoidanceTopics(text: string): string[] {
  const topics: string[] = [];

  const avoidSection = extractSection(text, [
    'avoid',
    'uncomfortable',
    'sensitive',
    'restricted',
    'never discuss',
    'does not talk',
    'doesn\'t talk',
    'deflect',
    'off-limits',
    'off limits',
  ]);

  if (avoidSection) {
    const items = extractListItems(avoidSection);
    topics.push(...items);
  }

  // Look for avoidance patterns
  const avoidPatterns = [
    /(?:avoids?|doesn'?t\s+(?:like\s+)?(?:talk|discuss)|uncomfortable\s+with|sensitive\s+about)\s+([^\n.]+)/gi,
    /(?:off[- ]limits?|restricted|taboo)\s*(?:topics?)?(?:\s*(?:include|are|:))?\s*([^\n.]+)/gi,
    /(?:never|rarely)\s+(?:talks?|discusses?|mentions?)\s+(?:about\s+)?([^\n.]+)/gi,
  ];

  for (const pattern of avoidPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const topicStr = match[1].trim();
      const splitTopics = topicStr.split(/,|\band\b/).map((t) => t.trim()).filter((t) => t.length > 1);
      topics.push(...splitTopics);
    }
  }

  return deduplicateAndClean(topics).slice(0, 10);
}

// --- Helper functions ---

/**
 * Extract a section of text that relates to the given keywords.
 * Looks for headings or paragraphs containing the keywords.
 */
function extractSection(text: string, keywords: string[]): string | null {
  const lines = text.split('\n');
  let sectionStart = -1;
  let sectionEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();

    // Check if this line is a heading or label containing a keyword
    const isHeading =
      /^#{1,4}\s/.test(lines[i]) ||
      /^[A-Z\s]{3,}:?\s*$/.test(lines[i].trim()) ||
      /^\d+\.\s/.test(lines[i]) ||
      /^[-•*]\s/.test(lines[i]) ||
      /:\s*$/.test(lines[i].trim());

    const containsKeyword = keywords.some((kw) => lineLower.includes(kw));

    if (containsKeyword && (isHeading || sectionStart === -1)) {
      sectionStart = i;

      // Find the end of this section (next heading or empty line gap)
      sectionEnd = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        const isNextHeading =
          /^#{1,4}\s/.test(lines[j]) ||
          (/^[A-Z\s]{3,}:?\s*$/.test(lines[j].trim()) && lines[j].trim().length > 3);

        if (isNextHeading && j > i + 1) {
          sectionEnd = j;
          break;
        }

        // Stop at large gaps (2+ empty lines)
        if (
          j > i + 2 &&
          lines[j].trim() === '' &&
          j + 1 < lines.length &&
          lines[j + 1].trim() === ''
        ) {
          sectionEnd = j;
          break;
        }
      }

      break;
    }
  }

  if (sectionStart === -1) {
    return null;
  }

  return lines.slice(sectionStart, sectionEnd).join('\n');
}

/**
 * Extract list items from a section of text.
 * Handles bullet points, numbered lists, and comma-separated items.
 */
function extractListItems(section: string): string[] {
  const items: string[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and headings
    if (!trimmed || /^#{1,4}\s/.test(trimmed)) continue;

    // Bullet point or numbered list item
    const listMatch = trimmed.match(/^[-•*]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (listMatch) {
      const item = listMatch[1].trim();
      if (item.length > 1 && item.length < 100) {
        items.push(item);
      }
      continue;
    }

    // Comma-separated items in a line (if line contains commas and isn't a full sentence)
    if (trimmed.includes(',') && !trimmed.endsWith('.') && trimmed.split(',').length >= 3) {
      const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 1 && p.length < 60);
      items.push(...parts);
    }
  }

  return items;
}

/**
 * Deduplicate and clean a list of strings.
 */
function deduplicateAndClean(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const cleaned = item
      .trim()
      .replace(/^[-•*]\s*/, '')
      .replace(/[.;,]$/, '')
      .trim();

    if (cleaned.length === 0) continue;

    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(cleaned);
    }
  }

  return result;
}
