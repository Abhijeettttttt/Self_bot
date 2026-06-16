import { describe, it, expect } from 'vitest';
import { parseChatLog } from './chat-log-parser';

describe('chat-log-parser', () => {
  describe('parseChatLog', () => {
    it('should throw error for empty input', () => {
      expect(() => parseChatLog('', 'Abhijeet')).toThrow('Chat log is empty');
      expect(() => parseChatLog('   ', 'Abhijeet')).toThrow('Chat log is empty');
    });

    it('should throw error for unparseable content', () => {
      expect(() => parseChatLog('random text\nno format here', 'Abhijeet')).toThrow(
        'No valid WhatsApp messages found'
      );
    });

    it('should throw error when target sender not found', () => {
      const log = '19/02/2025, 10:47 pm - Rishav: Hello there';
      expect(() => parseChatLog(log, 'Abhijeet')).toThrow(
        'No messages found from sender "Abhijeet"'
      );
    });

    it('should warn when fewer than 10 messages from target sender', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: Hello',
        '19/02/2025, 10:48 pm - Abhijeet: How are you',
        '19/02/2025, 10:49 pm - Rishav: Good',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Only 2 messages');
    });

    it('should extract only target sender messages', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: Chal be bihari',
        '19/02/2025, 10:50 pm - Rishav: Uth nhi paaunga',
        '19/02/2025, 10:50 pm - Abhijeet: Sona kyu h',
        '19/02/2025, 10:51 pm - Rishav: Abe chal dunga',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('Chal be bihari');
      expect(result.messages[1].content).toBe('Sona kyu h');
    });

    it('should preserve chronological order', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: First',
        '19/02/2025, 10:48 pm - Rishav: Middle',
        '19/02/2025, 10:49 pm - Abhijeet: Second',
        '20/02/2025, 9:48 pm - Abhijeet: Third',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages[0].content).toBe('First');
      expect(result.messages[1].content).toBe('Second');
      expect(result.messages[2].content).toBe('Third');
    });

    it('should handle media omitted markers', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: Hello',
        '19/02/2025, 10:48 pm - Abhijeet: <Media omitted>',
        '19/02/2025, 10:49 pm - Abhijeet: Bye',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      // Media messages are included in messages but excluded from text analysis
      expect(result.messages).toHaveLength(3);
      expect(result.messages[1].content).toBe('<Media omitted>');
    });

    it('should handle multiline messages', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: First line',
        'Second line of same message',
        '19/02/2025, 10:48 pm - Rishav: Reply',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe(
        'First line\nSecond line of same message'
      );
    });

    it('should skip system messages', () => {
      const log = [
        '06/10/2024, 6:26 pm - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. *Learn more*',
        '19/02/2025, 10:47 pm - Abhijeet: Hello',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello');
    });

    it('should handle sender names with spaces', () => {
      const log = [
        '19/02/2025, 10:47 pm - Rishav Vit Patna: Hello',
        '19/02/2025, 10:48 pm - Abhijeet: Hi',
      ].join('\n');

      const result = parseChatLog(log, 'Rishav Vit Patna');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].sender).toBe('Rishav Vit Patna');
    });

    it('should handle edited message markers', () => {
      const log = [
        '21/02/2025, 10:06 pm - Abhijeet: Baki mang n uss ldke se <This message was edited>',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('<This message was edited>');
    });
  });

  describe('analysis', () => {
    it('should calculate message length stats', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: Hi',
        '19/02/2025, 10:48 pm - Abhijeet: Hello there friend',
        '19/02/2025, 10:49 pm - Abhijeet: Short',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.analysis.messageLength.avg).toBeGreaterThan(0);
      expect(result.analysis.messageLength.p90).toBeGreaterThan(0);
    });

    it('should extract frequent phrases appearing 3+ times', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: tnsn not bro',
        '19/02/2025, 10:48 pm - Abhijeet: tnsn not yaar',
        '19/02/2025, 10:49 pm - Abhijeet: tnsn not dude',
        '19/02/2025, 10:50 pm - Abhijeet: something else',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.analysis.frequentPhrases).toContain('tnsn not');
    });

    it('should not include phrases appearing fewer than 3 times', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: hello world',
        '19/02/2025, 10:48 pm - Abhijeet: hello world',
        '19/02/2025, 10:49 pm - Abhijeet: something else',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.analysis.frequentPhrases).not.toContain('hello world');
    });

    it('should extract emoji frequency', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: Hello 😂',
        '19/02/2025, 10:48 pm - Abhijeet: Haha 😂😂',
        '19/02/2025, 10:49 pm - Abhijeet: Nice 👍',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      expect(result.analysis.emojiFrequency['😂']).toBe(3);
      expect(result.analysis.emojiFrequency['👍']).toBe(1);
    });

    it('should extract vocabulary patterns', () => {
      const messages = Array.from({ length: 5 }, (_, i) => 
        `19/02/2025, 10:${47 + i} pm - Abhijeet: bhai kya scene h`
      ).join('\n');

      const result = parseChatLog(messages, 'Abhijeet');
      expect(result.analysis.vocabularyPatterns.length).toBeGreaterThan(0);
      expect(result.analysis.vocabularyPatterns).toContain('bhai');
    });

    it('should handle messages with only media (no text analysis)', () => {
      const log = [
        '19/02/2025, 10:47 pm - Abhijeet: <Media omitted>',
        '19/02/2025, 10:48 pm - Abhijeet: <Media omitted>',
        '19/02/2025, 10:49 pm - Abhijeet: Hello',
      ].join('\n');

      const result = parseChatLog(log, 'Abhijeet');
      // Should not crash, analysis based on the one text message
      expect(result.analysis.messageLength.avg).toBe(5); // "Hello" = 5 chars
    });
  });

  describe('timestamp parsing', () => {
    it('should parse 12-hour format with pm', () => {
      const log = '19/02/2025, 10:47 pm - Abhijeet: Hello';
      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages[0].timestamp.getHours()).toBe(22);
      expect(result.messages[0].timestamp.getMinutes()).toBe(47);
    });

    it('should parse 12-hour format with am', () => {
      const log = '19/02/2025, 9:48 am - Abhijeet: Morning';
      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages[0].timestamp.getHours()).toBe(9);
      expect(result.messages[0].timestamp.getMinutes()).toBe(48);
    });

    it('should parse 2-digit year', () => {
      const log = '19/02/25, 10:47 pm - Abhijeet: Hello';
      const result = parseChatLog(log, 'Abhijeet');
      expect(result.messages[0].timestamp.getFullYear()).toBe(2025);
    });
  });
});
