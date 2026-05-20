import { api } from '@/lib/api';

export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  channels: { id: string; channelId: string; externalId: string; channel: { id: string; type: string; name: string } }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  conversations?: any[];
  _count?: { conversations: number };
  createdAt: string;
}

/**
 * S20 Wave 1: stats devolvidas por POST /contacts/sync-avatars. Frontend
 * usa pra montar toast "X de Y contatos sincronizados em Z segundos".
 */
export interface SyncAvatarsResult {
  total: number;
  enriched: number;
  skipped: number;
  failed: number;
  durationMs: number;
}

export const contactsService = {
  async list(params?: Record<string, string>): Promise<{
    contacts: Contact[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data } = await api.get('/contacts', { params });
    return data.data;
  },

  async getById(id: string): Promise<Contact> {
    const { data } = await api.get(`/contacts/${id}`);
    return data.data;
  },

  async update(id: string, payload: Partial<Contact>): Promise<Contact> {
    const { data } = await api.patch(`/contacts/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },

  /**
   * S20 Wave 1: backfill sincrono de fotos do WhatsApp pra todos os contatos
   * da org. Operacao cara (chamadas Zappfy) — RBAC OWNER/ADMIN no backend.
   * Tempo esperado: ~30s pra 100 contatos (concorrencia 5 paralelos).
   */
  async syncAvatars(): Promise<SyncAvatarsResult> {
    const { data } = await api.post<{ data: SyncAvatarsResult }>('/contacts/sync-avatars');
    return data.data;
  },
};
