import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { receiveMessage, upsertMessage } from '@/features/inbox/hooks/message-cache';
import { inboxService, type Conversation, type Message } from '@/features/inbox/services/inbox.service';
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { getConversation: vi.fn() } }));
type ConversationPages = InfiniteData<{ conversations: Conversation[]; pagination: Record<string, unknown> }>;
type MessagePage = { messages: Message[]; pagination?: unknown };
const message = { id: 'new', conversationId: 'c', direction: 'INBOUND', createdAt: '2026-10-27T12:00:00Z', content: { text: 'hello' } } as Message;
it('deduplica salas e consumidores, reordena páginas e preserva metadados', () => {
  const client = new QueryClient();
  const key = ['conversations', 'org'];
  client.setQueryData(key, { pageParams: [1, 2], pages: [{ conversations: [{ id: 'other', lastMessageAt: '2026-10-26', unreadCount: 1 }], pagination: { page: 1 } }, { conversations: [{ id: 'c', unreadCount: 2, lastMessageAt: '2026-10-25' }], pagination: { page: 2 } }] });
  client.setQueryData(['messages', 'c'], { messages: [], pagination: { preserved: true } });
  for (let i = 0; i < 4; i++) receiveMessage(client, { message });
  const data = client.getQueryData<ConversationPages>(key)!;
  expect(data.pages[0].conversations[0].id).toBe('c');
  expect(data.pages[0].conversations[0].unreadCount).toBe(3);
  expect(data.pageParams).toEqual([1, 2]);
  expect(client.getQueryData<MessagePage>(['messages', 'c'])!).toEqual({ messages: [message], pagination: { preserved: true } });
  client.clear();
});

it('conversa desconhecida compartilha busca em voo e soma o badge uma vez', async () => {
  const client = new QueryClient();
  const key = ['conversations'];
  const pending = Promise.withResolvers<Conversation>();
  const getConversation = vi.mocked(inboxService.getConversation).mockReset().mockReturnValue(pending.promise);
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [], pagination: {} }] });
  client.setQueryData(['conversation', 'c'], { id: 'c', unreadCount: 2 } as Conversation);

  receiveMessage(client, { message });
  receiveMessage(client, { message });
  expect(getConversation).toHaveBeenCalledTimes(1);
  expect(getConversation).toHaveBeenCalledWith('c');
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toHaveLength(0);
  expect(client.getQueryData<Conversation>(['conversation', 'c'])!.unreadCount).toBe(3);

  // The HTTP response already includes the incoming message in its unread count.
  pending.resolve({ id: 'c', unreadCount: 3, messages: [message] } as Conversation);
  await vi.waitFor(() => expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toHaveLength(1));
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations[0].unreadCount).toBe(3);
  expect(getConversation).toHaveBeenCalledTimes(1);
  client.clear();
});

it('busca de conversa desconhecida que falha libera nova tentativa na entrega seguinte', async () => {
  const client = new QueryClient();
  const key = ['conversations'];
  const first = Promise.withResolvers<Conversation>();
  const retry = Promise.withResolvers<Conversation>();
  const getConversation = vi.mocked(inboxService.getConversation).mockReset()
    .mockReturnValueOnce(first.promise).mockReturnValue(retry.promise);
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [], pagination: {} }] });

  receiveMessage(client, { message });
  first.reject(new Error('fixture: unavailable'));
  await first.promise.catch(() => undefined);
  // Let the chained rejection handler clear the projection before redelivery.
  await Promise.resolve();
  receiveMessage(client, { message });
  expect(getConversation).toHaveBeenCalledTimes(2);
  receiveMessage(client, { message });
  expect(getConversation).toHaveBeenCalledTimes(2);

  retry.resolve({ id: 'c', unreadCount: 1, messages: [message] } as Conversation);
  await vi.waitFor(() => expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toHaveLength(1));
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations[0].unreadCount).toBe(1);
  expect(getConversation).toHaveBeenCalledTimes(2);
  client.clear();
});
it('atualiza somente o detalhe correspondente e não altera preview para evento antigo', () => {
  const client = new QueryClient();
  client.setQueryData(['conversation', 'c'], { id: 'c', lastMessageAt: '2026-10-28', messages: [{ id: 'latest' }] } as Conversation);
  client.setQueryData(['conversations'], { pageParams: [1], pages: [{ conversations: [{ id: 'c', lastMessageAt: '2026-10-28' }], pagination: {} }] });
  receiveMessage(client, { message }, 'c');
  expect(client.getQueryData<Conversation>(['conversation', 'c'])!.messages).toEqual([{ id: 'latest' }]);
  expect(client.getQueryData<Conversation>(['conversation', 'c'])!.unreadCount).toBe(0);
  client.clear();
});
it('POST confirma uma bolha mesmo se o WS já inseriu o id definitivo', () => {
  const client = new QueryClient();
  client.setQueryData(['messages', 'c'], { messages: [{ ...message, id: 'pending:1' }, message] });
  upsertMessage(client, message, 'pending:1');
  expect(client.getQueryData<MessagePage>(['messages', 'c'])!.messages).toEqual([message]);
  client.clear();
});
it('entrada e saída em views de direção preservam filtros e não fazem refetch', () => {
  const client = new QueryClient();
  const row = { id: 'c', organizationId: 'org', unreadCount: 1, contact: {}, messages: [], lastMessageAt: null } as unknown as Conversation;
  const baseKey = ['conversations', 'org', null, '|||ps:|mp:0|t:', '', null, null, 'ALL', 'user'];
  const inboundKey = ['conversations', 'org', 'inbound-view', '|||ps:|mp:0|t:', '', null, null, 'ALL', 'user'];
  const outboundKey = ['conversations', 'org', 'outbound-view', '|||ps:|mp:0|t:', '', null, null, 'ALL', 'user'];
  client.setQueryData(['inbox-views', 'org'], [{ id: 'inbound-view', filters: { lastDirection: 'inbound' } }, { id: 'outbound-view', filters: { lastDirection: 'outbound' } }]);
  for (const key of [baseKey, inboundKey, outboundKey]) client.setQueryData(key, { pageParams: [1], pages: [{ conversations: key === outboundKey ? [row] : key === baseKey ? [row] : [], pagination: {} }] });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(inboundKey)!.pages[0].conversations[0].id).toBe('c');
  expect(client.getQueryData<ConversationPages>(outboundKey)!.pages[0].conversations).toHaveLength(0);
  expect(invalidate).not.toHaveBeenCalled();
  client.clear();
});
it('preserva a linha aberta no inbox geral sem filtros nem projeto', () => {
  const client = new QueryClient();
  const key = ['conversations', 'fixture-org', null, '|||ps:|mp:|t:', '', null, null, 'ALL', 'fixture-user'];
  const row = { id: 'c', organizationId: 'fixture-org', isGroup: false, contact: {}, unreadCount: 0, messages: [], lastMessageAt: '2026-10-27T12:00:00Z' } as unknown as Conversation;
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [row, { ...row, id: 'same-date' }], pagination: {} }] });
  receiveMessage(client, { message }, 'c');
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations.map((row: Conversation) => row.id)).toEqual(['c', 'same-date']);
  client.clear();
});

it('payload sem cache não consome o id antes de absorver a entrega completa', () => {
  const client = new QueryClient();
  const key = ['conversations'];
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [{ id: 'c', unreadCount: 2 }], pagination: {} }] });
  receiveMessage(client, { message });
  receiveMessage(client, { message });
  expect(client.getQueryData(['messages', 'c'])).toBeUndefined();
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations[0].unreadCount).toBe(3);
  client.setQueryData(['messages', 'c'], { messages: [], pagination: { preserved: true } });
  const complete = { ...message, externalId: 'complete', content: { text: 'complete payload' } };
  receiveMessage(client, { message: complete });
  receiveMessage(client, { message: complete });
  expect(client.getQueryData<MessagePage>(['messages', 'c'])).toEqual({ messages: [complete], pagination: { preserved: true } });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations[0].unreadCount).toBe(3);
  client.clear();
});

it.each([
  ['all', false, false], ['all', true, false],
  ['people', false, false], ['groups', true, false],
  ['projects', false, true], ['projects', true, true],
] as const)('mantém %s (grupo=%s, projeto=%s) após entrega duplicada sem GET', async (tab, isGroup, hasProject) => {
  const { inboxService } = await import('@/features/inbox/services/inbox.service');
  vi.mocked(inboxService.getConversation).mockClear();
  const client = new QueryClient();
  const key = ['conversations', 'org', null, '|||ps:|mp:0|t:tag', 'cliente', 'ch', null, 'MINE', 'user', tab];
  const row = { id: 'c', organizationId: 'org', channelId: 'ch', assignedToId: 'user', isGroup, contact: { name: 'Cliente' }, tags: [{ tag: { id: 'tag' } }], project: hasProject ? { exists: true } : null, unreadCount: 0, messages: [] } as unknown as Conversation;
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [row], pagination: { page: 1 } }] });
  receiveMessage(client, { message });
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toMatchObject([{ id: 'c', unreadCount: 1 }]);
  expect(inboxService.getConversation).not.toHaveBeenCalled();
  client.clear();
});

it.each([
  ['people', true, false], ['groups', false, false], ['projects', false, false], ['mentorships', false, true],
] as const)('não insere conversa incompatível na aba %s', (tab, isGroup, hasProject) => {
  const client = new QueryClient();
  const row = { id: 'c', organizationId: 'org', isGroup, contact: {}, project: hasProject ? { exists: true } : null, messages: [] } as unknown as Conversation;
  const key = ['conversations', 'org', null, '|||ps:|mp:0|t:', '', null, null, 'ALL', 'user', tab];
  client.setQueryData(['conversations'], { pageParams: [1], pages: [{ conversations: [row], pagination: {} }] });
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [], pagination: {} }] });
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toEqual([]);
  client.clear();
});

it('combina Todas com os filtros da caixa salva sem excluir grupos', () => {
  const client = new QueryClient();
  const key = ['conversations', 'org', 'view', '|||ps:|mp:0|t:', '', null, null, 'ALL', 'user', 'all'];
  const row = { id: 'c', organizationId: 'org', isGroup: true, status: 'OPEN', contact: {}, messages: [] } as unknown as Conversation;
  client.setQueryData(['inbox-views'], [{ id: 'view', filters: { kind: 'GROUP', statuses: ['OPEN'] } }]);
  client.setQueryData(key, { pageParams: [1], pages: [{ conversations: [row], pagination: {} }] });
  receiveMessage(client, { message });
  expect(client.getQueryData<ConversationPages>(key)!.pages[0].conversations).toHaveLength(1);
  client.clear();
});
