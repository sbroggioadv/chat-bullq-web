import { api } from '@/lib/api';

export interface JarvisDesk {
  channelId: string;
  conversationId: string;
  contactId: string;
}

export const jarvisDeskService = {
  async open(): Promise<JarvisDesk> {
    const { data } = await api.get('/jarvis-desk');
    return (data?.data ?? data) as JarvisDesk;
  },
};
