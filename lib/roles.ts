export type AdminRole = 'owner' | 'admin' | 'editor';

export const ROLES: AdminRole[] = ['owner', 'admin', 'editor'];

export const ROLE_LABEL: Record<AdminRole, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor' };

export const ROLE_HELP: Record<AdminRole, string> = {
  owner: 'Everything, including all admins.',
  admin: 'Everything, and can add, block or remove admins and editors. Not owners.',
  editor: 'Website content and the collection only.',
};

/** Admin screens an editor can open. Owners and admins open everything. */
const EDITOR_PATHS = ['/home', '/pages', '/menu', '/texts', '/events', '/press', '/instagram', '/pieces', '/sections', '/admins'];

export function isRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

export function canOpen(role: AdminRole | null, href: string): boolean {
  if (!role) return false;
  if (role !== 'editor' || href === '/') return true;
  return EDITOR_PATHS.some((p) => href === p || href.startsWith(`${p}/`));
}

/** May `actor` add, block, remove or set the password of someone with role `target`? */
export function canManage(actor: AdminRole | null, target: AdminRole): boolean {
  if (actor === 'owner') return true;
  if (actor === 'admin') return target !== 'owner';
  return false;
}
