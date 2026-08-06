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

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  messageId: string;
}

/** Anexos outbound (compose/reply/forward) — base64 JSON. */
export interface OutboundEmailAttachment {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export const MAX_OUTBOUND_ATTACHMENTS = 5;
export const MAX_OUTBOUND_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/** Lê File do browser como payload de anexo outbound. */
export async function fileToOutboundAttachment(
  file: File,
): Promise<OutboundEmailAttachment> {
  if (file.size > MAX_OUTBOUND_ATTACHMENT_BYTES) {
    throw new Error(`"${file.name}" excede 8 MB`);
  }
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    filename: file.name || 'anexo',
    mimeType: file.type || 'application/octet-stream',
    contentBase64: btoa(binary),
  };
}

export interface EmailMessage {
  id: string;
  from: { email: string; name?: string };
  to: string;
  cc?: string;
  subject: string;
  date: string | null;
  body: string;
  /** HTML sanitizado no servidor (allowlist). */
  bodyHtml?: string;
  snippet: string;
  unread: boolean;
  outbound: boolean;
  messageId?: string;
  attachments?: EmailAttachment[];
}

export interface EmailThreadDetail {
  id: string;
  externalConversationId: string;
  subject: string;
  messages: EmailMessage[];
  canSend?: boolean;
  needsReauthForSend?: boolean;
  myEmail?: string | null;
  starred?: boolean;
  spam?: boolean;
  important?: boolean;
  unread?: boolean;
  /** true se este GET removeu UNREAD no Gmail */
  markedRead?: boolean;
  labelIds?: string[];
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
    bodyHtml?: string;
    to?: string;
    cc?: string;
    replyAll?: boolean;
    subject?: string;
    attachments?: OutboundEmailAttachment[];
  }): Promise<{ success: boolean; id: string; threadId: string }> {
    const { data } = await api.post('/email/reply', input);
    return data.data ?? data;
  },

  async forward(input: {
    channelId: string;
    threadId: string;
    to: string;
    body?: string;
    bodyHtml?: string;
    subject?: string;
    attachments?: OutboundEmailAttachment[];
  }): Promise<{ success: boolean; id: string; threadId: string }> {
    const { data } = await api.post('/email/forward', input);
    return data.data ?? data;
  },

  async compose(input: {
    channelId: string;
    to: string;
    subject: string;
    body: string;
    bodyHtml?: string;
    cc?: string;
    attachments?: OutboundEmailAttachment[];
  }): Promise<{ success: boolean; id: string; threadId: string }> {
    const { data } = await api.post('/email/compose', input);
    return data.data ?? data;
  },

  async archive(input: {
    channelId: string;
    threadId: string;
  }): Promise<{ success: boolean; threadId: string }> {
    const { data } = await api.post('/email/archive', input);
    return data.data ?? data;
  },

  async downloadAttachment(input: {
    channelId: string;
    messageId: string;
    attachmentId: string;
    filename?: string;
    mimeType?: string;
  }): Promise<Blob> {
    const { data } = await api.get('/email/attachments', {
      params: input,
      responseType: 'blob',
    });
    return data as Blob;
  },

  async modify(input: {
    channelId: string;
    threadId: string;
    action?:
      | 'star'
      | 'unstar'
      | 'spam'
      | 'unspam'
      | 'read'
      | 'unread'
      | 'archive'
      | 'important'
      | 'unimportant';
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }): Promise<{ success: boolean; threadId: string; labelIds?: string[] }> {
    const { data } = await api.post('/email/modify', input);
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
