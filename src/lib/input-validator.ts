/**
 * Input validator for the Abhijeet Chatbot.
 * Validates user input before sending to the API.
 *
 * - Rejects whitespace-only strings (spaces, tabs, newlines, Unicode whitespace)
 * - Accepts strings with at least one non-whitespace character
 * - Enforces 2000 character maximum length
 */

export const MAX_INPUT_LENGTH = 2000;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates user chat input.
 * Returns { valid: true } if the input is acceptable,
 * or { valid: false, reason } if it should be rejected.
 */
export function validateInput(input: string): ValidationResult {
  // Reject whitespace-only strings using Unicode-aware regex
  // \s matches spaces, tabs, newlines, and Unicode whitespace characters
  if (/^\s*$/.test(input)) {
    return { valid: false, reason: 'empty' };
  }

  // Enforce maximum length
  if (input.length > MAX_INPUT_LENGTH) {
    return { valid: false, reason: 'too_long' };
  }

  return { valid: true };
}
