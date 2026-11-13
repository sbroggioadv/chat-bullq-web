import { api } from '@/lib/api';
import type { Message } from '@/features/inbox/services/inbox.service';

export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface SearchHit {
  id: string; createdAt: string; direction: Message['direction']; type: string;
  senderName: string | null; snippet: string; matchStart: number; matchLength: number;
}
export type AttachmentOrigin = 'received' | 'sent';
export interface AttachmentFilters { q?: string; origin?: AttachmentOrigin }
export type AttachmentKind = 'image' | 'video' | 'audio' | 'document';
export interface ConversationAttachment {
  messageId: string; kind: AttachmentKind; fileName: string | null; mimeType: string | null;
  sizeBytes: number | null; createdAt: string; direction: Message['direction'];
  senderName: string | null; mediaPath: string;
}
export interface ConversationSummary {
  text: string; sections: { assunto: string; situacao: string; pendencias: string; proximoPasso: string };
  generatedAt: string; messageCount: number; stale: boolean;
}
export interface ConversationMeeting {
  eventId: string | null; title: string; start: string | null; end: string | null; meetLink: string | null;
  attendees: string[]; status: string; createdAt: string;
}
export interface MeetingsResponse { connected: boolean; items: ConversationMeeting[] }
export interface MessagesAround { items: Message[] }
function idPath(id: string) {
  if (!id.trim()) throw new Error('Conversa inválida.');
  return `/conversations/${encodeURIComponent(id)}`;
}
export function safeExternalUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export const conversationInsightsService = {
  async search(id: string, query: string, before?: string, signal?: AbortSignal): Promise<CursorPage<SearchHit>> {
    const q = query.trim(); if (q.length < 2) throw new Error('Digite pelo menos dois caracteres.');
    const { data } = await api.get(`${idPath(id)}/messages/search`, { params: { q, limit: 50, before }, signal }); return data.data;
  },
  async around(id: string, messageId: string, signal?: AbortSignal): Promise<MessagesAround> {
    if (!messageId.trim()) throw new Error('Mensagem inválida.');
    const { data } = await api.get(`${idPath(id)}/messages/around/${encodeURIComponent(messageId)}`, { params: { limit: 40 }, signal }); return data.data;
  },
  async summary(id: string, signal?: AbortSignal): Promise<ConversationSummary | null> {
    const { data } = await api.get(`${idPath(id)}/summary`, { signal }); return data?.data ?? null;
  },
  async generateSummary(id: string, force = false): Promise<ConversationSummary> {
    const { data } = await api.post(`${idPath(id)}/summary`, { force }, { timeout: 90000 }); return data.data;
  },
  async attachments(id: string, kind: AttachmentKind | 'all' = 'all', before?: string, signal?: AbortSignal, filters: AttachmentFilters = {}): Promise<CursorPage<ConversationAttachment>> {
    const { data } = await api.get(`${idPath(id)}/attachments`, { params: { kind, limit: 50, before, ...filters }, signal }); return data.data;
  },
  async meetings(id: string, signal?: AbortSignal): Promise<MeetingsResponse> {
    const { data } = await api.get(`${idPath(id)}/meetings`, { signal }); return data.data;
  },
  async resolveMedia(messageId: string): Promise<{ url: string; mimeType?: string }> {
    const { data } = await api.get(`/messages/${encodeURIComponent(messageId)}/media`);
    const media = data.data as { url: string; mimeType?: string };
    const url = safeExternalUrl(media.url); if (!url) throw new Error('Endereço de mídia inválido.');
    // Same unplayable URL criteria as useResolvedMedia: never expose encrypted provider URLs.
    if (/\.enc(\?|$)/i.test(url) || /mmg\.whatsapp\.net/i.test(url)) throw new Error('Mídia ainda indisponível. Tente novamente para solicitar uma nova resolução.');
    return { ...media, url };
  },
  async download(messageId: string, filename: string): Promise<void> {
    try {
      const { url } = await this.resolveMedia(messageId);
      // Media resolves to a provider/signed URL. Do not forward the API's bearer token to it.
      const response = await fetch(url); if (!response.ok) throw new Error('Não foi possível baixar o anexo.');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      throw new Error('Não foi possível baixar o arquivo. Tente abrir pelo botão Abrir.');
    }
  },
};
