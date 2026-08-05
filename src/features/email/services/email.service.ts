import { api } from '@/lib/api';

export interface EmailChannel {
  id: string;
  name: string;
  email: string | null;
  canSend?: boolean;
  needsReauthForSend?: boolean;
}

export interface EmailStatus {
  connected: boolean;
  channels: EmailChannel[];
}

export interface EmailFolder {
  id: string;
  name: string;
  kind: 'system' | 'user';
}

export interface EmailThreadSummary {
  id: string;
  externalConversationId: string;
  subject: string;
  from: { email: string; name?: string };
  snippet: string;
  date: string | null;
  unread: boolean;
}

export interface EmailThreadsPage {
  channelId: string;
  folderId: string;
  threads: EmailThreadSummary[];
  nextPageToken: string | null;
}

export interface EmailMessage {
  id: string;
  from: { email: string; name?: string };
  to: string;
  subject: string;
  date: string | null;
  body: string;
  snippet: string;
  unread: boolean;
  outbound: boolean;
  messageId?: string;
}

export interface EmailThreadDetail {
  id: string;
  externalConversationId: string;
  subject: string;
  messages: EmailMessage[];
  canSend?: boolean;
  needsReauthForSend?: boolean;
  myEmail?: string | null;
}

export const emailService = {
  async status(): Promise<EmailStatus> {
    const { data } = await api.get('/email/status');
    return data.data ?? data;
  },
  async folders(channelId: string): Promise<{ channelId: string; folders: EmailFolder[] }> {
    const { data } = await api.get('/email/folders', { params: { channelId } });
    return data.data ?? data;
  },
  async threads(
    channelId: string,
    folderId: string,
    pageToken?: string,
  ): Promise<EmailThreadsPage> {
    const { data } = await api.get('/email/threads', {
      params: { channelId, folderId, pageToken },
    });
    return data.data ?? data;
  },
  async thread(channelId: string, threadId: string): Promise<EmailThreadDetail> {
    const { data } = await api.get(`/email/threads/${threadId}`, {
      params: { channelId },
    });
    return data.data ?? data;
  },

  async reply(input: {
    channelId: string;
    threadId: string;
    body: string;
    to?: string;
    subject?: string;
  }): Promise<{ success: boolean; id: string; threadId: string }> {
    const { data } = await api.post('/email/reply', input);
    return data.data ?? data;
  },

  async forward(input: {
    channelId: string;
    threadId: string;
    to: string;
    body?: string;
    subject?: string;
  }): Promise<{ success: boolean; id: string; threadId: string }> {
    const { data } = await api.post('/email/forward', input);
    return data.data ?? data;
  },
};

/** URL ?folder= usa a forma da SPEC (inbox|sent|spam|label:<id>). */
export function folderIdToParam(folderId: string): string {
  switch (folderId) {
    case 'INBOX':
      return 'inbox';
    case 'SENT':
      return 'sent';
    case 'SPAM':
      return 'spam';
    default:
      return `label:${folderId}`;
  }
}

export function paramToFolderId(param: string | null): string {
  if (!param) return 'INBOX';
  switch (param) {
    case 'inbox':
      return 'INBOX';
    case 'sent':
      return 'SENT';
    case 'spam':
      return 'SPAM';
    default:
      return param.startsWith('label:') ? param.slice('label:'.length) : param;
  }
}
