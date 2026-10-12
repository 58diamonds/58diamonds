/** Admin passwords: at least 8 characters, with a capital, a number and a special character. */
export const PASSWORD_RULE = 'At least 8 characters, with one capital letter, one number and one special character (like ! ? # @).';

/** What is missing from a password, or null when it is good. */
export function passwordProblem(pw: string): string | null {
  const missing: string[] = [];
  if (pw.length < 8) missing.push('8 characters');
  if (!/[A-Z]/.test(pw)) missing.push('a capital letter');
  if (!/[0-9]/.test(pw)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(pw)) missing.push('a special character');
  return missing.length ? `The password needs ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : null;
}
