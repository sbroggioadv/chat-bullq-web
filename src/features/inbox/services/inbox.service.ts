import { api } from '@/lib/api';
import type { ProjectSummary } from '@/features/projects/services/projects.service';

export interface TagRef {
  id: string;
  name: string;
  color: string;
}

export interface TagLink {
  tag: TagRef;
}

export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  tags?: TagLink[];
}

export interface ChannelInfo {
  id: string;
  type: string;
  name: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface LastMessage {
  id: string;
  type: string;
  content: Record<string, any>;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  channelId: string;
  contactId: string;
  assignedToId: string | null;
  status: string;
  protocol: string | null;
  subject?: string | null;
  isGroup: boolean;
  /** S22 — whitelist explícita pra IA em grupos. Default false. */
  aiAllowedInGroup: boolean;
  isArchived?: boolean;
  archivedAt?: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  aiEnabled?: boolean | null;
  aiDisabledBy?: string | null;
  aiDisabledAt?: string | null;
  activeAgentId?: string | null;
  contact: Contact;
  channel: ChannelInfo;
  assignedTo: AgentInfo | null;
  messages: LastMessage[];
  tags?: TagLink[];
  _count: { messages: number };
  /** Inbound messages newer than the current user's lastReadAt cursor. */
  unreadCount?: number;
  /** Projeto do grupo (quando isGroup). null = sem projeto ainda. */
  project?: ProjectSummary | null;
}

export interface MessageSender {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface StoryReplyContext {
  id?: string;
  url?: string;
  kind?: 'reply' | 'mention';
}

export interface ReplyContext {
  externalMessageId?: string;
  story?: StoryReplyContext;
  ad?: { id?: string; title?: string };
  /** ID interno da Message original — preenchido quando a reply foi
   *  criada pela nossa UI (botão "Responder"). Usado pelo MessageBubble
   *  pra fazer scroll/highlight da msg original ao clicar no quote. */
  messageId?: string;
  /** Trecho da msg original (até ~120 chars) — UI mostra como preview. */
  previewText?: string;
  /** Nome de quem enviou a msg original — UI mostra acima do preview. */
  senderName?: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationMs?: number;
  provider: string;
  transcribedAt: string;
}

export interface MessageMetadata {
  isEcho?: boolean;
  replyTo?: ReplyContext | null;
  transcription?: TranscriptionResult | null;
  rawPayload?: any;
  [key: string]: any;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: Record<string, any>;
  externalId: string | null;
  status: string;
  /** Motivo do erro quando status=FAILED. Vem direto do provider WhatsApp.
   *  Ex.: "Re-engagement message" = janela 24h expirada → precisa template. */
  failedReason?: string | null;
  senderName: string | null;
  senderId: string | null;
  sender: MessageSender | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  metadata?: MessageMetadata | null;
  /** Quando setado, mensagem foi deletada pra todos. UI renderiza placeholder. */
  revokedAt?: string | null;
  revokedBy?: string | null;
  /** true = provider confirmou delete (cliente final viu sumir).
   *  false = só sumiu no nosso lado (provider não suportou). */
  revokeSucceededRemote?: boolean | null;
}

export interface PaginatedResponse<T> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const inboxService = {
  async getConversations(params?: Record<string, string>): Promise<{
    conversations: Conversation[];
    pagination: any;
  }> {
    const { data } = await api.get('/conversations', { params });
    return data.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data } = await api.get(`/conversations/${id}`);
    return data.data;
  },

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<{
    messages: Message[];
    pagination: any;
  }> {
    const { data } = await api.get('/messages', {
      params: { conversationId, page, limit },
    });
    return data.data;
  },

  async sendMessage(payload: {
    conversationId: string;
    type: string;
    content: Record<string, any>;
    /** ID interno da Message respondida — backend resolve externalId. */
    replyToMessageId?: string;
  }): Promise<Message> {
    const { data } = await api.post('/messages', payload);
    return data.data;
  },

  /**
   * Deleta mensagem pra todos. Tenta propagar pro provider. Resposta indica
   * se o provider aceitou (cliente final viu sumir) ou se foi só local.
   */
  async revokeMessage(messageId: string): Promise<{
    messageId: string;
    revokedAt: string;
    revokedBy: string;
    succeededRemote: boolean;
    remoteError: string | null;
  }> {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data.data ?? data;
  },

  /**
   * Encaminha uma mensagem pra N conversas. Backend reusa send() por destino,
   * respeitando isolamento de tenant + rate-limit por canal. Resposta síncrona
   * com `queued` (destinos aceitos) e `rejected` (motivos por destino).
   */
  async forwardMessage(payload: {
    messageId: string;
    destinationConversationIds: string[];
  }): Promise<{
    queued: string[];
    rejected: Array<{ conversationId: string; reason: string }>;
  }> {
    const { data } = await api.post(`/messages/${payload.messageId}/forward`, {
      destinationConversationIds: payload.destinationConversationIds,
    });
    return data.data ?? data;
  },

  async assignToMe(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/assign-me`);
    return data.data;
  },

  /**
   * Atribui (ou desatribui com null) a conversa pra um user da org.
   * Usa o endpoint genérico de update que aceita assignedToId.
   */
  async assignTo(
    conversationId: string,
    assignedToId: string | null,
  ): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${conversationId}`, {
      assignedToId,
    });
    return data.data;
  },

  async closeConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/close`);
    return data.data;
  },

  async markAsRead(
    conversationId: string,
    lastReadMessageId?: string,
  ): Promise<{ ok: boolean; lastReadAt: string }> {
    const { data } = await api.post(`/conversations/${conversationId}/read`, {
      lastReadMessageId,
    });
    return data.data ?? data;
  },

  async markAsUnread(
    conversationId: string,
  ): Promise<{ ok: boolean; unreadCount: number }> {
    const { data } = await api.post(`/conversations/${conversationId}/unread`);
    return data.data ?? data;
  },

  async reopenConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/reopen`);
    return data.data;
  },

  async syncConversation(
    conversationId: string,
  ): Promise<{ imported: number; fetched: number; syncedAt: string }> {
    const { data } = await api.post(`/conversations/${conversationId}/sync`, {});
    return data.data;
  },

  async toggleAi(
    conversationId: string,
    enabled: boolean | null,
  ): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${conversationId}/ai`, {
      enabled,
    });
    return data.data ?? data;
  },

  async engageAi(
    conversationId: string,
  ): Promise<{ engaged: boolean; reason?: string }> {
    const { data } = await api.post(
      `/conversations/${conversationId}/ai/engage`,
    );
    return data.data ?? data;
  },

  async setActiveAgent(
    conversationId: string,
    agentId: string,
  ): Promise<{ engaged: boolean; reason?: string; agentName?: string }> {
    const { data } = await api.post(
      `/conversations/${conversationId}/ai/set-agent`,
      { agentId },
    );
    return data.data ?? data;
  },

  async getStatusCounts(): Promise<Record<string, number>> {
    const { data } = await api.get('/conversations/counts');
    return data.data;
  },

  async bulkClose(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/close`)));
  },

  async bulkAssignToMe(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/assign-me`)));
  },

  async bulkReopen(ids: string[]): Promise<void> {
    await Promise.allSettled(ids.map((id) => api.post(`/conversations/${id}/reopen`)));
  },

  async bulkSetAi(ids: string[], enabled: boolean | null): Promise<void> {
    await Promise.allSettled(
      ids.map((id) => api.patch(`/conversations/${id}/ai`, { enabled })),
    );
  },

  async bulkEngageAi(ids: string[]): Promise<void> {
    await Promise.allSettled(
      ids.map((id) => api.post(`/conversations/${id}/ai/engage`)),
    );
  },

  async updateConversation(
    conversationId: string,
    patch: { subject?: string | null },
  ): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${conversationId}`, patch);
    return data.data ?? data;
  },

  async renameContact(contactId: string, name: string): Promise<void> {
    await api.patch(`/contacts/${contactId}`, { name });
  },

  async archive(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/archive`);
    return data.data;
  },

  async unarchive(conversationId: string): Promise<Conversation> {
    const { data } = await api.post(`/conversations/${conversationId}/unarchive`);
    return data.data;
  },

  async resolveMediaUrl(messageId: string): Promise<{ url: string; mimeType?: string }> {
    const { data } = await api.get(`/messages/${messageId}/media`);
    return data.data;
  },

  async transcribeAudio(messageId: string, force = false): Promise<TranscriptionResult> {
    // NOTE: body must be {} (not null) — express.json({ strict: true }) rejects
    // literal "null" with "Unexpected token 'n', \"null\" is not valid JSON".
    const { data } = await api.post(`/messages/${messageId}/transcribe`, {}, {
      params: force ? { force: 'true' } : undefined,
    });
    return data.data;
  },

  async uploadAudio(blob: Blob, filename?: string): Promise<{
    url: string;
    mimeType: string;
    size: number;
  }> {
    // Derive filename extension from the blob's actual MIME so Safari (mp4)
    // and Chrome/Firefox (webm) both upload with consistent name/content.
    // Browsers set the multipart Content-Type from blob.type — backend uses
    // that, not the filename — but keeping them consistent is best practice.
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
    };
    const normalisedMime = (blob.type || 'audio/webm').split(';')[0].trim();
    const ext = mimeToExt[normalisedMime] || 'webm';
    const finalName = filename || `audio.${ext}`;
    const form = new FormData();
    form.append('file', blob, finalName);
    const { data } = await api.post('/messages/uploads/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async sendAudioMessage(conversationId: string, blob: Blob): Promise<Message> {
    const upload = await this.uploadAudio(blob);
    return this.sendMessage({
      conversationId,
      type: 'AUDIO',
      content: {
        mediaUrl: upload.url,
        mimeType: upload.mimeType,
        fileSize: upload.size,
      },
    });
  },

  async uploadImage(file: File): Promise<{
    url: string;
    mimeType: string;
    size: number;
    filename: string;
  }> {
    const form = new FormData();
    form.append('file', file, file.name || 'image.png');
    const { data } = await api.post('/messages/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async sendImageMessage(
    conversationId: string,
    file: File,
    caption?: string,
  ): Promise<Message> {
    const upload = await this.uploadImage(file);
    return this.sendMessage({
      conversationId,
      type: 'IMAGE',
      content: {
        mediaUrl: upload.url,
        mimeType: upload.mimeType,
        fileSize: upload.size,
        ...(caption && caption.trim() ? { caption: caption.trim() } : {}),
      },
    });
  },

  /**
   * S18/W3-Z: upload polimorfico que aceita qualquer tipo (image/audio/video/
   * document). Backend valida MIME + magic bytes e retorna `contentTypeBucket`
   * pra UI mapear no Message.contentType sem reparsear no frontend.
   */
  async uploadFile(file: File): Promise<{
    url: string;
    mimeType: string;
    size: number;
    filename: string;
    contentTypeBucket: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  }> {
    const form = new FormData();
    form.append('file', file, file.name || 'attachment.bin');
    const { data } = await api.post('/messages/uploads/file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  /**
   * S18/W3-Z: envio polimorfico de anexo. Detecta tipo via backend
   * (contentTypeBucket) e seta Message.type apropriado (IMAGE/AUDIO/VIDEO/DOCUMENT).
   * Caption opcional em todos os tipos (nao so imagem como antes).
   */
  async sendFileMessage(
    conversationId: string,
    file: File,
    caption?: string,
  ): Promise<Message> {
    const upload = await this.uploadFile(file);
    return this.sendMessage({
      conversationId,
      type: upload.contentTypeBucket, // IMAGE / AUDIO / VIDEO / DOCUMENT
      content: {
        mediaUrl: upload.url,
        mimeType: upload.mimeType,
        fileSize: upload.size,
        ...(upload.filename ? { fileName: upload.filename } : {}),
        ...(caption && caption.trim() ? { caption: caption.trim() } : {}),
      },
    });
  },
};
