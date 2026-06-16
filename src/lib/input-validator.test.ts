import { describe, it, expect } from 'vitest';
import { validateInput, MAX_INPUT_LENGTH } from './input-validator';

describe('Input Validator', () => {
  describe('whitespace-only rejection', () => {
    it('rejects empty string', () => {
      expect(validateInput('')).toEqual({ valid: false, reason: 'empty' });
    });

    it('rejects spaces only', () => {
      expect(validateInput('   ')).toEqual({ valid: false, reason: 'empty' });
    });

    it('rejects tabs only', () => {
      expect(validateInput('\t\t')).toEqual({ valid: false, reason: 'empty' });
    });

    it('rejects newlines only', () => {
      expect(validateInput('\n\n\r\n')).toEqual({ valid: false, reason: 'empty' });
    });

    it('rejects mixed whitespace', () => {
      expect(validateInput(' \t \n \r\n ')).toEqual({ valid: false, reason: 'empty' });
    });

    it('rejects Unicode whitespace characters', () => {
      // Non-breaking space, em space, en space, thin space
      expect(validateInput('\u00A0\u2003\u2002\u2009')).toEqual({ valid: false, reason: 'empty' });
    });
  });

  describe('valid input acceptance', () => {
    it('accepts a simple message', () => {
      expect(validateInput('hello')).toEqual({ valid: true });
    });

    it('accepts a message with leading/trailing whitespace', () => {
      expect(validateInput('  hello  ')).toEqual({ valid: true });
    });

    it('accepts a single non-whitespace character', () => {
      expect(validateInput('a')).toEqual({ valid: true });
    });

    it('accepts emoji-only input', () => {
      expect(validateInput('😊')).toEqual({ valid: true });
    });

    it('accepts input at exactly max length', () => {
      const input = 'a'.repeat(MAX_INPUT_LENGTH);
      expect(validateInput(input)).toEqual({ valid: true });
    });
  });

  describe('maximum length enforcement', () => {
    it('rejects input exceeding 2000 characters', () => {
      const input = 'a'.repeat(2001);
      expect(validateInput(input)).toEqual({ valid: false, reason: 'too_long' });
    });

    it('accepts input at exactly 2000 characters', () => {
      const input = 'a'.repeat(2000);
      expect(validateInput(input)).toEqual({ valid: true });
    });

    it('MAX_INPUT_LENGTH is 2000', () => {
      expect(MAX_INPUT_LENGTH).toBe(2000);
    });
  });
});
