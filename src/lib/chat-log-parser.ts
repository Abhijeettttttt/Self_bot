/**
 * WhatsApp chat log parser.
 * Extracts messages by sender name, analyzes vocabulary patterns,
 * frequent phrases, and emoji frequency.
 */

export interface ChatLogAnalysis {
  frequentPhrases: string[]; // appearing 3+ times
  vocabularyPatterns: string[];
  messageLength: { avg: number; p90: number };
  emojiFrequency: Record<string, number>;
}

export interface ParsedMessage {
  timestamp: Date;
  sender: string;
  content: string;
}

export interface ChatLogParseResult {
  analysis: ChatLogAnalysis;
  messages: ParsedMessage[];
  warnings: string[];
}

/**
 * Regex to match WhatsApp message lines.
 * Format: "DD/MM/YYYY, H:MM am/pm - Sender Name: message text"
 * Also handles 24h format and various date separators.
 */
const MESSAGE_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm|AM|PM)?)\s-\s(.+?):\s(.*)$/;

/**
 * Regex to match system messages (no sender).
 * Format: "DD/MM/YYYY, H:MM am/pm - system message text"
 */
const SYSTEM_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm|AM|PM)?)\s-\s(.+)$/;

/**
 * Regex to match emoji characters (covers most common emoji ranges).
 */
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}]/gu;

const MEDIA_OMITTED_MARKER = '<Media omitted>';

/**
 * Parse a WhatsApp chat log and extract analysis for a target sender.
 *
 * @param chatLog - Raw WhatsApp export text
 * @param targetSender - Name of the sender to extract messages for
 * @returns Parse result with analysis, messages, and any warnings
 * @throws Error if the log is empty or completely unparseable
 */
export function parseChatLog(
  chatLog: string,
  targetSender: string
): ChatLogParseResult {
  if (!chatLog || chatLog.trim().length === 0) {
    throw new Error(
      'Chat log is empty. Please provide a valid WhatsApp chat export.'
    );
  }

  const lines = chatLog.split('\n');
  const allMessages = parseLines(lines);

  if (allMessages.length === 0) {
    throw new Error(
      'Chat log could not be parsed. No valid WhatsApp messages found. ' +
        'Ensure the file is a WhatsApp chat export in the expected format ' +
        '(DD/MM/YYYY, H:MM am/pm - Sender: message).'
    );
  }

  // Filter messages by target sender (case-sensitive match)
  const targetMessages = allMessages.filter(
    (msg) => msg.sender === targetSender
  );

  const warnings: string[] = [];

  if (targetMessages.length === 0) {
    throw new Error(
      `No messages found from sender "${targetSender}". ` +
        `Available senders: ${getUniqueSenders(allMessages).join(', ')}`
    );
  }

  if (targetMessages.length < 10) {
    warnings.push(
      `Only ${targetMessages.length} messages found from "${targetSender}". ` +
        `At least 10 messages are recommended for reliable style extraction.`
    );
  }

  // Filter out media-only messages for text analysis
  const textMessages = targetMessages.filter(
    (msg) => !isMediaOnly(msg.content)
  );

  const analysis = analyzeMessages(textMessages);

  return {
    analysis,
    messages: targetMessages,
    warnings,
  };
}

/**
 * Parse raw lines into structured messages, handling multiline messages.
 */
function parseLines(lines: string[]): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  let currentMessage: ParsedMessage | null = null;

  for (const line of lines) {
    const messageMatch = line.match(MESSAGE_LINE_REGEX);

    if (messageMatch) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, datePart, timePart, sender, content] = messageMatch;
      const timestamp = parseTimestamp(datePart, timePart);

      currentMessage = {
        timestamp,
        sender,
        content,
      };
    } else if (SYSTEM_LINE_REGEX.test(line) && !MESSAGE_LINE_REGEX.test(line)) {
      // System message (e.g., "Messages and calls are end-to-end encrypted...")
      // Save previous message and skip system messages
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = null;
      }
    } else if (currentMessage && line.trim().length > 0) {
      // Continuation of a multiline message
      currentMessage = {
        timestamp: currentMessage.timestamp,
        sender: currentMessage.sender,
        content: currentMessage.content + '\n' + line,
      };
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

/**
 * Parse a WhatsApp timestamp string into a Date object.
 */
function parseTimestamp(datePart: string, timePart: string): Date {
  const [day, month, year] = datePart.split('/').map(Number);
  const fullYear = year < 100 ? 2000 + year : year;

  // Parse time - handle both 12h and 24h formats
  const timeStr = timePart.trim().toLowerCase();
  let hours: number;
  let minutes: number;

  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(am|pm)?/);
  if (!timeMatch) {
    return new Date(fullYear, month - 1, day);
  }

  hours = parseInt(timeMatch[1], 10);
  minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[4];

  if (period) {
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
  }

  return new Date(fullYear, month - 1, day, hours, minutes);
}

/**
 * Check if a message content is media-only.
 */
function isMediaOnly(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed === MEDIA_OMITTED_MARKER ||
    trimmed === 'This message was deleted' ||
    trimmed === 'You deleted this message'
  );
}

/**
 * Get unique sender names from parsed messages.
 */
function getUniqueSenders(messages: ParsedMessage[]): string[] {
  return [...new Set(messages.map((msg) => msg.sender))];
}

/**
 * Analyze text messages to extract vocabulary patterns, phrases, and emoji usage.
 */
function analyzeMessages(messages: ParsedMessage[]): ChatLogAnalysis {
  if (messages.length === 0) {
    return {
      frequentPhrases: [],
      vocabularyPatterns: [],
      messageLength: { avg: 0, p90: 0 },
      emojiFrequency: {},
    };
  }

  const messageLengths = messages.map((msg) => msg.content.length);
  const avgLength =
    messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length;
  const sortedLengths = [...messageLengths].sort((a, b) => a - b);
  const p90Index = Math.floor(sortedLengths.length * 0.9);
  const p90Length = sortedLengths[Math.min(p90Index, sortedLengths.length - 1)];

  const frequentPhrases = extractFrequentPhrases(messages);
  const vocabularyPatterns = extractVocabularyPatterns(messages);
  const emojiFrequency = extractEmojiFrequency(messages);

  return {
    frequentPhrases,
    vocabularyPatterns,
    messageLength: { avg: Math.round(avgLength), p90: p90Length },
    emojiFrequency,
  };
}

/**
 * Extract phrases that appear 3 or more times across messages.
 * Looks at 2-4 word n-grams.
 */
function extractFrequentPhrases(messages: ParsedMessage[]): string[] {
  const phraseCounts = new Map<string, number>();

  for (const msg of messages) {
    const content = msg.content
      .replace(/<Media omitted>/g, '')
      .replace(/<This message was edited>/g, '')
      .trim();

    if (!content) continue;

    // Normalize: lowercase, remove extra whitespace
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ').filter((w) => w.length > 0);

    // Extract n-grams (2-4 words)
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const phrase = words.slice(i, i + n).join(' ');
        // Skip phrases that are just URLs or very short
        if (phrase.includes('http') || phrase.length < 4) continue;
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
      }
    }
  }

  // Also count full short messages (1-5 words) as phrases
  const fullMessageCounts = new Map<string, number>();
  for (const msg of messages) {
    const content = msg.content
      .replace(/<Media omitted>/g, '')
      .replace(/<This message was edited>/g, '')
      .trim();

    if (!content) continue;

    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    const wordCount = normalized.split(' ').length;

    if (wordCount >= 1 && wordCount <= 5 && !normalized.includes('http')) {
      fullMessageCounts.set(
        normalized,
        (fullMessageCounts.get(normalized) || 0) + 1
      );
    }
  }

  // Merge full message counts into phrase counts
  for (const [phrase, count] of fullMessageCounts) {
    const existing = phraseCounts.get(phrase) || 0;
    if (count > existing) {
      phraseCounts.set(phrase, count);
    }
  }

  // Filter to phrases appearing 3+ times, sort by frequency
  const frequent = [...phraseCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase);

  return frequent;
}

/**
 * Extract vocabulary patterns: abbreviations, slang, and characteristic words.
 */
function extractVocabularyPatterns(messages: ParsedMessage[]): string[] {
  const wordCounts = new Map<string, number>();

  for (const msg of messages) {
    const content = msg.content
      .replace(/<Media omitted>/g, '')
      .replace(/<This message was edited>/g, '')
      .trim();

    if (!content) continue;

    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Common English stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'me',
    'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he',
    'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
    'their', 'theirs', 'am', 'then', 'there', 'here', 'up', 'out', 'about',
  ]);

  // Find characteristic words (appear 3+ times, not stop words, short-ish)
  const patterns = [...wordCounts.entries()]
    .filter(
      ([word, count]) =>
        count >= 3 &&
        !stopWords.has(word) &&
        word.length >= 2 &&
        word.length <= 20
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);

  return patterns;
}

/**
 * Extract emoji frequency from messages.
 */
function extractEmojiFrequency(
  messages: ParsedMessage[]
): Record<string, number> {
  const emojiCounts: Record<string, number> = {};

  for (const msg of messages) {
    const emojis = msg.content.match(EMOJI_REGEX);
    if (emojis) {
      for (const emoji of emojis) {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      }
    }
  }

  // Sort by frequency and return top emojis
  const sorted = Object.entries(emojiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  return Object.fromEntries(sorted);
}
