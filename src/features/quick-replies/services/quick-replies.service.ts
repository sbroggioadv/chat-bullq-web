import { api } from '@/lib/api';

export interface QuickReply {
  id: string;
  organizationId: string;
  userId: string | null;
  shortcut: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickReplyPayload {
  shortcut: string;
  title: string;
  content: string;
}

export type UpdateQuickReplyPayload = Partial<CreateQuickReplyPayload>;

export const quickRepliesService = {
  async list(): Promise<QuickReply[]> {
    const { data } = await api.get('/quick-replies');
    return data.data ?? data;
  },
  async create(payload: CreateQuickReplyPayload): Promise<QuickReply> {
    const { data } = await api.post('/quick-replies', payload);
    return data.data ?? data;
  },
  async update(id: string, payload: UpdateQuickReplyPayload): Promise<QuickReply> {
    const { data } = await api.patch(`/quick-replies/${id}`, payload);
    return data.data ?? data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  },
};
