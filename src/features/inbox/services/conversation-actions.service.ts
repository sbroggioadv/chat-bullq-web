import { api } from '@/lib/api';

export type MuteMode = '1h' | '8h' | '24h' | 'forever' | 'off';
export interface InternalNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
export interface SendChannel {
  channelId: string;
  name: string;
  type: string;
  current: boolean;
  conversationId: string | null;
  available: boolean;
  reason: string | null;
}
const base = (id: string) => `/conversations/${encodeURIComponent(id)}`;
function noteContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) throw new Error('A nota deve ter entre 1 e 4.000 caracteres.');
  return trimmed;
}
export const conversationActionsService = {
  async mute(id: string, mode: MuteMode) {
    const { data } = await api.patch<{ data: { id: string; mutedUntil: string | null } }>(`${base(id)}/mute`, { mode });
    return data.data;
  },
  async notes(id: string): Promise<InternalNote[]> {
    const { data } = await api.get<{ data: InternalNote[] }>(`${base(id)}/notes`);
    return data.data;
  },
  async createNote(id: string, content: string) {
    const { data } = await api.post<{ data: InternalNote }>(`${base(id)}/notes`, { content: noteContent(content) });
    return data.data;
  },
  async updateNote(id: string, noteId: string, content: string) {
    const { data } = await api.patch<{ data: InternalNote }>(`${base(id)}/notes/${encodeURIComponent(noteId)}`, { content: noteContent(content) });
    return data.data;
  },
  async deleteNote(id: string, noteId: string) {
    await api.delete(`${base(id)}/notes/${encodeURIComponent(noteId)}`);
  },
  async sendChannels(id: string): Promise<SendChannel[]> {
    const { data } = await api.get<{ data: SendChannel[] }>(`${base(id)}/send-channels`);
    return data.data;
  },
  async openChannel(id: string, channelId: string) {
    const { data } = await api.post<{ data: { conversationId: string } }>(`${base(id)}/send-channels/${encodeURIComponent(channelId)}/open`);
    if (!data.data?.conversationId) throw new Error('O canal não retornou uma conversa de destino.');
    return data.data;
  },
};
