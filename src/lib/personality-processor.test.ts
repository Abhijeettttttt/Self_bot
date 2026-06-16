import { describe, it, expect } from 'vitest';
import { processPersonalityReport, PersonalityProfile } from './personality-processor';

describe('personality-processor', () => {
  describe('processPersonalityReport', () => {
    it('throws error for empty input', () => {
      expect(() => processPersonalityReport('')).toThrow(
        'Personality report is empty'
      );
      expect(() => processPersonalityReport('   ')).toThrow(
        'Personality report is empty'
      );
      expect(() => processPersonalityReport('\n\t')).toThrow(
        'Personality report is empty'
      );
    });

    it('returns a valid PersonalityProfile structure', () => {
      const report = `
# Personality Analysis

## Tone
- Casual and friendly
- Sarcastic when joking
- Direct and blunt

## Humor Style
Uses dry humor and self-deprecating jokes. Often makes fun of situations.

## Catchphrases
- "Tnsn not"
- "Ezzz"
- "Dang"

## Abbreviations
av = abhi
bt = but
h = hai
n = na

## Passion Topics
- Cricket
- Gaming
- Technology

## Avoidance Topics
- Politics
- Religion
`;

      const profile = processPersonalityReport(report);

      expect(profile).toHaveProperty('toneDescriptors');
      expect(profile).toHaveProperty('sentencePatterns');
      expect(profile).toHaveProperty('greetingHabits');
      expect(profile).toHaveProperty('humorStyle');
      expect(profile).toHaveProperty('catchphrases');
      expect(profile).toHaveProperty('emojiUsage');
      expect(profile).toHaveProperty('abbreviations');
      expect(profile).toHaveProperty('passionTopics');
      expect(profile).toHaveProperty('avoidanceTopics');

      expect(Array.isArray(profile.toneDescriptors)).toBe(true);
      expect(Array.isArray(profile.sentencePatterns)).toBe(true);
      expect(Array.isArray(profile.greetingHabits)).toBe(true);
      expect(typeof profile.humorStyle).toBe('string');
      expect(Array.isArray(profile.catchphrases)).toBe(true);
      expect(typeof profile.emojiUsage).toBe('object');
      expect(typeof profile.abbreviations).toBe('object');
      expect(Array.isArray(profile.passionTopics)).toBe(true);
      expect(Array.isArray(profile.avoidanceTopics)).toBe(true);
    });

    it('extracts tone descriptors from a tone section', () => {
      const report = `
## Tone
- Casual and friendly
- Sarcastic when joking
- Direct and blunt
- Energetic
`;
      const profile = processPersonalityReport(report);
      expect(profile.toneDescriptors.length).toBeGreaterThan(0);
      expect(profile.toneDescriptors.some((d) => d.toLowerCase().includes('casual'))).toBe(true);
    });

    it('extracts humor style', () => {
      const report = `
## Humor Style
Uses dry humor and self-deprecating jokes. Often makes fun of situations with sarcasm.
`;
      const profile = processPersonalityReport(report);
      expect(profile.humorStyle.length).toBeGreaterThan(0);
      expect(profile.humorStyle.toLowerCase()).toContain('dry humor');
    });

    it('extracts catchphrases from quoted text', () => {
      const report = `
## Catchphrases
He often says "Tnsn not" and "Ezzz" when chatting.
Also frequently uses "Dang" and "Yeaaaa".
`;
      const profile = processPersonalityReport(report);
      expect(profile.catchphrases.length).toBeGreaterThan(0);
      expect(profile.catchphrases.some((p) => p.includes('Tnsn not'))).toBe(true);
    });

    it('extracts abbreviations with equals sign format', () => {
      const report = `
## Abbreviations
av = abhi
bt = but
h = hai
n = na
fr = phir
`;
      const profile = processPersonalityReport(report);
      expect(Object.keys(profile.abbreviations).length).toBeGreaterThan(0);
      expect(profile.abbreviations['av']).toBe('abhi');
      expect(profile.abbreviations['bt']).toBe('but');
    });

    it('extracts passion topics', () => {
      const report = `
## Passion Topics
- Cricket
- Gaming
- Technology
- Anime
`;
      const profile = processPersonalityReport(report);
      expect(profile.passionTopics.length).toBeGreaterThan(0);
      expect(profile.passionTopics.some((t) => t.toLowerCase().includes('cricket'))).toBe(true);
      expect(profile.passionTopics.some((t) => t.toLowerCase().includes('gaming'))).toBe(true);
    });

    it('extracts avoidance topics', () => {
      const report = `
## Avoidance Topics
- Politics
- Religion
- Personal finances
`;
      const profile = processPersonalityReport(report);
      expect(profile.avoidanceTopics.length).toBeGreaterThan(0);
      expect(profile.avoidanceTopics.some((t) => t.toLowerCase().includes('politics'))).toBe(true);
    });

    it('extracts emoji usage from actual emojis in text', () => {
      const report = `
## Emoji Usage
Frequently uses 😂 and 🔥 in messages.
Also uses 💀 when something is very funny.
😂😂😂 is his go-to reaction.
`;
      const profile = processPersonalityReport(report);
      expect(Object.keys(profile.emojiUsage).length).toBeGreaterThan(0);
      expect(profile.emojiUsage['😂']).toBeGreaterThan(0);
    });

    it('extracts greeting habits', () => {
      const report = `
## Greeting Habits
- Opens with "Yo" or "Bhai"
- Rarely uses formal greetings
- Sometimes starts with "Kya scene hai"
`;
      const profile = processPersonalityReport(report);
      expect(profile.greetingHabits.length).toBeGreaterThan(0);
    });

    it('extracts sentence patterns', () => {
      const report = `
## Sentence Patterns
- Messages are short, typically 1-2 lines
- Uses fragmented sentences
- Rarely uses full stops
`;
      const profile = processPersonalityReport(report);
      expect(profile.sentencePatterns.length).toBeGreaterThan(0);
    });

    it('handles report with inline passion topic mentions', () => {
      const report = `
Abhijeet is passionate about cricket and gaming.
He loves talking about technology and anime.
His favorite topics include music and movies.
`;
      const profile = processPersonalityReport(report);
      expect(profile.passionTopics.length).toBeGreaterThan(0);
    });

    it('handles report with inline avoidance mentions', () => {
      const report = `
He avoids talking about politics and religion.
He never discusses personal finances with friends.
`;
      const profile = processPersonalityReport(report);
      expect(profile.avoidanceTopics.length).toBeGreaterThan(0);
    });

    it('returns defaults for minimal report with no structured sections', () => {
      const report = 'This is a basic personality report with no clear sections.';
      const profile = processPersonalityReport(report);

      // Should not throw, should return valid structure with empty/default values
      expect(profile.toneDescriptors).toBeDefined();
      expect(profile.humorStyle).toBeDefined();
      expect(typeof profile.humorStyle).toBe('string');
    });

    it('handles Windows-style line endings', () => {
      const report = '## Tone\r\n- Casual\r\n- Friendly\r\n\r\n## Passion Topics\r\n- Cricket\r\n';
      const profile = processPersonalityReport(report);
      expect(profile.toneDescriptors.length).toBeGreaterThan(0);
      expect(profile.passionTopics.length).toBeGreaterThan(0);
    });
  });
});
