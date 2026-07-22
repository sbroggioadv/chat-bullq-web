import { api } from '@/lib/api';

export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  /** Resolved by API when shareable=1 (name → profileName → phone). */
  displayName?: string;
  channels: {
    id: string;
    channelId: string;
    externalId: string;
    profileName?: string | null;
    profileAvatarUrl?: string | null;
    channel: { id: string; type: string; name: string };
  }[];
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
   * Tempo esperado: ~30s pra 100 contatos / ~50s pra 1000+ (concorrencia 5).
   *
   * HOTFIX: o `api` client tem timeout default de 15s (apropriado pra requests
   * normais), mas esta operacao excede facilmente. Override pra 3 minutos
   * cobre orgs com ate ~3000 contatos. Pra escala maior, migrar pra job
   * BullMQ background (fora do escopo da Wave 1).
   */
  async syncAvatars(): Promise<SyncAvatarsResult> {
    const { data } = await api.post<{ data: SyncAvatarsResult }>(
      '/contacts/sync-avatars',
      {},
      { timeout: 180_000 },
    );
    return data.data;
  },
};
