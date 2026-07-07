import type { Client } from '../types';

export function slugFromClientName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

export function isClientInstagramConnected(
  client: Pick<Client, 'instagramAccountId' | 'accessToken' | 'username'>
): boolean {
  return !!(client.instagramAccountId && client.accessToken && client.username);
}

/** Handle interno (slug / novo_*) usado quando o cliente ainda não conectou o Instagram. */
export function isPlaceholderInstagramHandle(
  instagram: string | null | undefined,
  name: string | null | undefined,
  connected = false
): boolean {
  if (connected) return false;
  const ig = (instagram || '').trim().replace(/^@+/, '');
  if (!ig || ig.startsWith('novo_')) return true;
  const slug = slugFromClientName(name || '');
  if (!slug) return true;
  return ig === slug;
}

/** @handle para clientes conectados; null quando o valor é só placeholder interno. */
export function getClientInstagramDisplay(
  client: Pick<Client, 'name' | 'instagram' | 'username' | 'instagramAccountId' | 'accessToken'>
): string | null {
  const connected = isClientInstagramConnected(client);
  if (connected) {
    const handle = (client.username || client.instagram || '').replace(/^@+/, '').trim();
    return handle ? `@${handle}` : null;
  }
  if (isPlaceholderInstagramHandle(client.instagram, client.name, false)) return null;
  const ig = (client.instagram || '').trim().replace(/^@+/, '');
  return ig ? `@${ig}` : null;
}

/** Rótulo exibido em páginas públicas de aprovação (com ou sem @). */
export function getPublicClientHandleLabel(
  client: Pick<Client, 'name' | 'instagram' | 'username' | 'instagramAccountId' | 'accessToken'>
): string {
  const connected = isClientInstagramConnected(client);
  if (connected) {
    const handle = (client.username || client.instagram || '').replace(/^@+/, '').trim();
    return handle ? `@${handle}` : (client.name || 'Cliente');
  }
  if (isPlaceholderInstagramHandle(client.instagram, client.name, false)) {
    return client.name || 'Cliente';
  }
  const ig = (client.instagram || '').trim().replace(/^@+/, '');
  return ig ? `@${ig}` : (client.name || 'Cliente');
}

export function deriveInternalInstagramSlug(name: string): string {
  return slugFromClientName(name) || `cliente_${Date.now()}`;
}
