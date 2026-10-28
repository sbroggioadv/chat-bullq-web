import { inboxViewsService, type InboxView } from '@/features/inbox-views/services/inbox-views.service';
import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import { inboxService, type Conversation, type Message } from '@/features/inbox/services/inbox.service';

type MessagePage = { messages: Message[]; pagination?: unknown };
type ConversationPage = { conversations: Conversation[]; pagination: Record<string, unknown> };
const deliveries = new WeakMap<QueryClient, Map<string, string>>();
// List badges must also deduplicate deliveries while the chat cache is absent.
const projectedDeliveries = new WeakMap<QueryClient, Map<string, string>>();

export function upsertMessage(client: QueryClient, message: Message, temporaryId?: string) {
  return client.setQueryData<MessagePage>(['messages', message.conversationId], (old) => {
    if (!old) return client.getQueryState(['messages', message.conversationId])?.fetchStatus === 'fetching' ? { messages: [message] } : old;
    const messages = old.messages.filter((m) => m.id !== temporaryId);
    const index = messages.findIndex((m) => m.id === message.id || (!!message.externalId && m.externalId === message.externalId));
    if (index < 0) messages.push(message);
    else messages[index] = { ...messages[index], ...message };
    return { ...old, messages };
  });
}

/** Shared by list and chat: one cache operation per delivery, even in overlapping rooms. */
export function receiveMessage(client: QueryClient, payload: { conversationId?: string; message?: Message }, activeId?: string | null) {
  const message = payload?.message;
  const id = payload?.conversationId ?? message?.conversationId;
  if (!message?.id || !id) return;
  let seen = deliveries.get(client);
  if (!seen) { seen = new Map(); deliveries.set(client, seen); }
  const key = `${id}:${message.id}`;
  // Status changes have their own event; don't let duplicate room deliveries increment badges.
  if (seen.has(key)) return;
  const absorbed = upsertMessage(client, { ...message, conversationId: id });
  if (absorbed) {
    seen.set(key, message.id);
    if (seen.size > 2000) seen.delete(seen.keys().next().value!);
  }
  let projected = projectedDeliveries.get(client);
  if (!projected) { projected = new Map(); projectedDeliveries.set(client, projected); }
  const alreadyProjected = projected.has(key);
  projected.set(key, message.id);
  if (projected.size > 2000) projected.delete(projected.keys().next().value!);
  const patch = (conversation: Conversation, increment = true): Conversation => {
    const latest = !conversation.lastMessageAt || message.createdAt >= conversation.lastMessageAt;
    return {
      ...conversation,
      ...(latest ? { messages: [message], lastMessageAt: message.createdAt } : {}),
      unreadCount: activeId === id || message.direction === 'OUTBOUND' ? 0 : (conversation.unreadCount ?? 0) + (increment && !alreadyProjected ? 1 : 0),
    };
  };
  client.setQueryData<Conversation>(['conversation', id], (old) => old ? patch(old) : old);
  const queries = client.getQueriesData<InfiniteData<ConversationPage>>({ queryKey: ['conversations'] });
  const known = queries.flatMap(([, data]) => data?.pages.flatMap((page) => page.conversations) ?? []).find((row) => row.id === id);
  const updateRows = (row: Conversation) => {
    for (const [queryKey] of queries) {
      client.setQueryData<InfiniteData<ConversationPage>>(queryKey, (old) => {
        if (!old?.pages.length) return old;
        const rows = old.pages.flatMap((page) => page.conversations);
        const previous = rows.find((entry) => entry.id === id);
        const matches = matchesList(client, queryKey, row);
        // Unknown server view definitions are reconciled when loaded, never guessed.
        if (matches === null && !previous) return old;
        const include = matches || matches === null && !!previous;
        const updated = rows.flatMap((entry) => entry.id === id ? include ? [row] : [] : [entry]);
        if (!previous && include) updated.push(row);
        if (!previous && !matches) return old;
        updated.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
        let offset = 0;
        return { ...old, pages: old.pages.map((page, index) => {
          const size = page.conversations.length + (index === old.pages.length - 1 ? updated.length - rows.length : 0);
          const conversations = updated.slice(offset, offset + Math.max(0, size));
          offset += Math.max(0, size);
          return { ...page, conversations };
        }) };
      });
    }
  };
  if (known) updateRows(patch(known));
  else if (!alreadyProjected) void inboxService.getConversation(id).then(async (row) => {
    // A new conversation needs its contact/channel to render. Fetch only this row.
    if (queries.some(([key]) => key[2] && !findView(client, String(key[2])))) {
      const views = await inboxViewsService.list();
      client.setQueryData(['inbox-views'], views);
    }
    updateRows(patch(row, false));
  }).catch(() => {
    // Release failed projections so the next delivery can retry this row.
    projected.delete(key);
  });
  client.setQueriesData<Conversation>({ queryKey: ['jarvis-desk-conversation'] }, (old) => old?.id === id ? patch(old) : old);
}

function findView(client: QueryClient, id: string) {
  return client.getQueriesData<InboxView[]>({ queryKey: ['inbox-views'] }).flatMap(([, views]) => Array.isArray(views) ? views : []).find((view) => view.id === id);
}

function matchesList(client: QueryClient, key: QueryKey, row: Conversation): boolean | null {
  // Some callers/tests use only the prefix; preserve their existing membership.
  if (key.length < 4) return true;
  if (key[1] && row.organizationId !== key[1]) return false;
  const view = key[2] ? findView(client, String(key[2])) : undefined;
  if (key[2] && !view) return null;
  const filters = view?.filters;
  const [unread, archived, groups, projectStatus, mineProjects, tags] = String(key[3]).split('|');
  const userId = key[8];
  // Optional suffix keeps the original positional key compatible with saved views.
  const tab = key[9];
  if (tab === 'mentorships') return false; // No canonical classification yet.
  if (tab === 'projects' && !row.project?.exists) return false;
  if ((unread === 'u' || filters?.unreadOnly) && !(row.unreadCount ?? 0)) return false;
  const archiveMode = archived === 'a' ? 'only' : filters?.archived ?? 'exclude';
  if (archiveMode === 'only' ? !row.isArchived : archiveMode === 'exclude' && row.isArchived) return false;
  const project = projectStatus?.slice(3);
  if (project && row.project?.status !== project) return false;
  if (mineProjects === 'mp:1' && row.project?.responsibleUserId !== userId) return false;
  if (key[6]) {
    // Segment membership is defined by the cached channel census.
    const segments = client.getQueryData<Array<{ id: string; members: Array<{ channelId: string }> }>>(['segments', key[1]]);
    const segment = segments?.find((entry) => entry.id === key[6]);
    if (!segment) return null;
    if (!row.isGroup || !segment.members.some((member) => member.channelId === row.channelId)) return false;
  } else if (project || mineProjects === 'mp:1') { if (!row.isGroup) return false; }
  else {
    if (key[5] && row.channelId !== key[5]) return false;
    if (tab === 'people' && row.isGroup || tab === 'groups' && !row.isGroup) return false;
    if (!tab && (groups === 'g' ? !row.isGroup : !view && row.isGroup)) return false;
  }
  if (key[7] === 'MINE' && row.assignedToId !== userId) return false;
  const search = String(key[4] ?? '').toLowerCase();
  if (search && ![row.contact?.name, row.contact?.phone, row.protocol].some((value) => value?.toLowerCase().includes(search))) return false;
  const tagIds = [...(row.tags ?? []), ...(row.contact?.tags ?? [])].map((link) => link.tag.id);
  const localTags = tags?.slice(2).split(',').filter(Boolean) ?? [];
  if (localTags.length && !localTags.some((id) => tagIds.includes(id))) return false;
  if (filters?.channelIds?.length && !filters.channelIds.includes(row.channelId)) return false;
  if (filters?.statuses?.length && !filters.statuses.includes(row.status)) return false;
  if (filters?.conversationIds?.length && !filters.conversationIds.includes(row.id)) return false;
  if (filters?.kind === 'GROUP' && !row.isGroup || filters?.kind === 'INDIVIDUAL' && row.isGroup) return false;
  if (filters?.tagIds?.length && !filters.tagIds.some((id) => tagIds.includes(id))) return false;
  if (filters?.lastDirection && filters.lastDirection !== 'any' && row.messages[0]?.direction.toLowerCase() !== filters.lastDirection) return false;
  const assigned = filters?.assignedTo;
  if (assigned === 'me' && row.assignedToId !== userId || assigned === 'none' && row.assignedToId) return false;
  if (assigned && !['any', 'me', 'none'].includes(assigned) && row.assignedToId !== assigned) return false;
  return true;
}
