import { describe, expect, it } from 'vitest';
import { isPlaceholderSlug, nextFreeSlug } from './slug';

describe('isPlaceholderSlug', () => {
  it('spots the addresses given at creation', () => {
    expect(isPlaceholderSlug('new-piece-mv5ld283')).toBe(true);
    expect(isPlaceholderSlug('new-page-mv5ld283')).toBe(true);
    expect(isPlaceholderSlug('event-mv5ld283')).toBe(true);
  });
  it('leaves chosen addresses alone', () => {
    expect(isPlaceholderSlug('rose-ring')).toBe(false);
    expect(isPlaceholderSlug('new-piece')).toBe(false);
    expect(isPlaceholderSlug('event-in-antwerp')).toBe(false);
  });
});

describe('nextFreeSlug', () => {
  it('keeps a free address', () => expect(nextFreeSlug('rose-ring', ['feather-ring'])).toBe('rose-ring'));
  it('numbers a taken one', () => expect(nextFreeSlug('rose-ring', ['rose-ring', 'rose-ring-2'])).toBe('rose-ring-3'));
});
