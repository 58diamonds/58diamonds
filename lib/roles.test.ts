import { describe, expect, it } from 'vitest';
import { canManage, canOpen, canSetPassword } from './roles';

describe('canManage', () => {
  it('lets an owner manage everyone', () => {
    expect(canManage('owner', 'owner')).toBe(true);
    expect(canManage('owner', 'admin')).toBe(true);
  });
  it('lets an admin manage admins and editors, never owners', () => {
    expect(canManage('admin', 'owner')).toBe(false);
    expect(canManage('admin', 'admin')).toBe(true);
    expect(canManage('admin', 'editor')).toBe(true);
  });
  it('lets an editor manage nobody', () => {
    expect(canManage('editor', 'editor')).toBe(false);
    expect(canManage(null, 'editor')).toBe(false);
  });
});

describe('canOpen', () => {
  it('keeps editors to content screens', () => {
    expect(canOpen('editor', '/')).toBe(true);
    expect(canOpen('editor', '/pieces/123')).toBe(true);
    expect(canOpen('editor', '/settings')).toBe(false);
    expect(canOpen('editor', '/requests')).toBe(false);
    expect(canOpen('editor', '/pagesx')).toBe(false);
  });
  it('opens everything for owners and admins', () => {
    expect(canOpen('admin', '/settings')).toBe(true);
    expect(canOpen('owner', '/booking')).toBe(true);
    expect(canOpen(null, '/')).toBe(false);
  });
});

describe('canSetPassword', () => {
  it('lets an admin set an owner password, but not an editor', () => {
    expect(canSetPassword('admin', 'owner')).toBe(true);
    expect(canSetPassword('owner', 'owner')).toBe(true);
    expect(canSetPassword('admin', 'editor')).toBe(true);
    expect(canSetPassword('editor', 'owner')).toBe(false);
    expect(canSetPassword('editor', 'editor')).toBe(false);
    expect(canSetPassword(null, 'owner')).toBe(false);
  });
});
