import { describe, expect, it } from 'vitest';
import { passwordProblem } from './password';

describe('admin password rule', () => {
  it('accepts 8 characters with a capital, a number and a special character', () => {
    expect(passwordProblem('Farah58!')).toBeNull();
    expect(passwordProblem('A very long passphrase 2026')).toBeNull();
  });

  it('says what is missing', () => {
    expect(passwordProblem('Farah5!')).toBe('The password needs 8 characters.');
    expect(passwordProblem('farah58!')).toBe('The password needs a capital letter.');
    expect(passwordProblem('Farahhh!')).toBe('The password needs a number.');
    expect(passwordProblem('Farah580')).toBe('The password needs a special character.');
    expect(passwordProblem('abc')).toBe('The password needs 8 characters, a capital letter, a number and a special character.');
  });
});
