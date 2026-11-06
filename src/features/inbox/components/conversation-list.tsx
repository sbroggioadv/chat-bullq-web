'use client';

import { mockupAvatarHue } from '@/components/ui/avatar-hue';
import type { CSSProperties } from 'react';

import { isAxiosError } from 'axios';
import { SegmentedControl } from '@/components/ui/foundation';
import { VirtualList } from '@/features/inbox/components/virtual-list';
import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  X,
  SlidersHorizontal,
  Check,
  UserCheck,
  XCircle,
  RotateCcw,
  Loader2,
  ChevronDown,
  Inbox,
  Users,
  FolderPlus,
  MailOpen,
  Archive,
  Layers,
  FolderKanban,
  Mail,
  Pin,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { inboxService, type Conversation, type MessageMetadata } from '@/features/inbox/services/inbox.service';
import { jarvisDeskService } from '@/features/ai-agents/services/jarvis-desk.service';
import {
  inboxViewsService,
  type InboxView,
} from '@/features/inbox-views/services/inbox-views.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { segmentsService } from '@/features/segments/services/segments.service';
import { PHASE_LABELS, PROJECT_STATUSES } from '@/features/projects/project-fields';
import { tagsService } from '@/features/settings/services/tags.service';
import { InstagramIcon } from '@/components/ui/icons';
import { useOrgId } from '@/hooks/use-org-query-key';
import { receiveMessage } from '@/features/inbox/hooks/message-cache';
import { useSocket } from '@/features/inbox/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { preferencesService } from '@/features/inbox/services/preferences.service';
import { useInboxPreferences } from '@/features/inbox/hooks/use-inbox-preferences';
import { ConversationContextMenu } from '@/features/inbox/components/conversation-context-menu';
import { BulkAiPopover } from '@/features/inbox/components/bulk-ai-popover';
import { BulkPipelinePopover } from '@/features/inbox/components/bulk-pipeline-popover';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';

function ListAvatar({ name, avatarUrl, isGroup }: { name: string | null; avatarUrl: string | null; isGroup: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        // WA CDN bloqueia hotlink com Referer; BullQ /uploads não se importa.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`bq-avatar-mockup object-cover ${isGroup ? "bq-avatar-group" : ""}`}
      />
    );
  }
  return (
    <div style={{"--bq-avatar-hue": mockupAvatarHue(name || "?")} as CSSProperties} className={`bq-avatar-mockup flex items-center justify-center ${isGroup ? "bq-avatar-group" : ""}`}>
      {initials}
    </div>
  );
}

type ConversationPage = Awaited<ReturnType<typeof inboxService.getConversations>>;
type ConversationTab = 'all' | 'people' | 'groups' | 'projects' | 'mentorships';

type ScopeFilter = 'ALL' | 'MINE';

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: MessageSquare,
  WHATSAPP_OFFICIAL: MessageSquare,
  INSTAGRAM: InstagramIcon,
  GMAIL: Mail,
  JARVIS: MessageSquare,
};


type ListFilter = 'unread' | 'archived' | 'groups';

const filterOptions: { label: string; value: ListFilter; icon: React.ElementType; description: string }[] = [
  {
    label: 'Não lidas',
    value: 'unread',
    icon: MailOpen,
    description: 'Apenas com mensagens novas',
  },
  {
    label: 'Arquivadas',
    value: 'archived',
    icon: Archive,
    description: 'Mostra a inbox arquivada',
  },
  {
    label: 'Grupos',
    value: 'groups',
    icon: Users,
    description: 'Inclui conversas de grupos. Desmarcado = esconde.',
  },
];

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  /**
   * When set, fetches conversations through the inbox view endpoint
   * (`/inbox-views/:id/conversations`) which applies the view's saved
   * filters server-side. The user's local filters (status/channel/scope)
   * still layer on top via query params.
   */
  viewId?: string | null;
}

export function ConversationList({ activeId, onSelect, viewId }: ConversationListProps) {
  const { data: savedViews = [] } = useQuery({ queryKey: ['inbox-views'], queryFn: () => inboxViewsService.list(), staleTime: 60_000 });
  const responseView = savedViews.find(view => view.filters.lastDirection === 'inbound');
  const router = useRouter();
  const navigation = useSearchParams();
  const navigationKey = new URLSearchParams(Array.from(navigation.entries()).filter(([key]) => ['box', 'kind', 'channel', 'tag'].includes(key))).toString();
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { on, onReconnect, connected } = useSocket();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const {
    preferences: savedPrefs,
    isLoaded: prefsLoaded,
    update: updatePrefs,
  } = useInboxPreferences();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  // Default false = grupos NÃO aparecem no inbox geral (regra do JP).
  // Toggle pra true exibe junto com individuais.
  const [showGroups, setShowGroups] = useState(false);
  const [conversationTab, setConversationTab] = useState<ConversationTab | null>(null);
  const activeTab = conversationTab ?? (viewId ? null : showGroups ? 'all' : 'people');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedProjectStatus, setSelectedProjectStatus] = useState('');
  const [mineProjects, setMineProjects] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  // showGroups conta como filtro ativo SÓ quando ON (default OFF é o
  // comportamento padrão, não merece badge). Tags contam 1 por tag.
  const activeFilterCount =
    (unreadOnly ? 1 : 0) +
    (archivedOnly ? 1 : 0) +
    (showGroups ? 1 : 0) +
    (selectedProjectStatus ? 1 : 0) +
    (mineProjects ? 1 : 0) +
    selectedTagIds.length;
  const [scope, setScope] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const hydratedRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    conversation: Conversation;
    position: { x: number; y: number };
  } | null>(null);

  // Hydrate state from saved preferences once they load
  useEffect(() => {
    if (!prefsLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (savedPrefs.scope === 'MINE' || savedPrefs.scope === 'ALL') {
      setScope(savedPrefs.scope);
    }
    if (typeof savedPrefs.unreadOnly === 'boolean') {
      setUnreadOnly(savedPrefs.unreadOnly);
    }
    if (typeof savedPrefs.archivedOnly === 'boolean') {
      setArchivedOnly(savedPrefs.archivedOnly);
    }
    if (typeof savedPrefs.showGroups === 'boolean') {
      setShowGroups(savedPrefs.showGroups);
    }
    if (savedPrefs.selectedChannelId !== undefined) {
      setSelectedChannelId(savedPrefs.selectedChannelId ?? null);
    }
    if (savedPrefs.selectedSegmentId !== undefined) {
      setSelectedSegmentId(savedPrefs.selectedSegmentId ?? null);
    }
    if (typeof savedPrefs.selectedProjectStatus === 'string') {
      setSelectedProjectStatus(savedPrefs.selectedProjectStatus);
    }
    if (typeof savedPrefs.mineProjects === 'boolean') {
      setMineProjects(savedPrefs.mineProjects);
    }
    if (Array.isArray(savedPrefs.tagIds)) {
      setSelectedTagIds(savedPrefs.tagIds);
    }
  }, [prefsLoaded, savedPrefs]);

  const toggleListFilter = useCallback(
    (value: ListFilter) => {
      if (value === 'unread') {
        setUnreadOnly((v) => {
          const next = !v;
          updatePrefs({ unreadOnly: next });
          return next;
        });
      } else if (value === 'archived') {
        setArchivedOnly((v) => {
          const next = !v;
          updatePrefs({ archivedOnly: next });
          return next;
        });
      } else if (value === 'groups') {
        setConversationTab(null);
        setShowGroups((v) => {
          const next = !v;
          updatePrefs({ showGroups: next });
          return next;
        });
      }
    },
    [updatePrefs],
  );

  const clearListFilters = useCallback(() => {
    setUnreadOnly(false);
    setArchivedOnly(false);
    setShowGroups(false);
    setSelectedTagIds([]);
    setSelectedProjectStatus('');
    setMineProjects(false);
    updatePrefs({
      unreadOnly: false,
      archivedOnly: false,
      showGroups: false,
      tagIds: [],
      selectedProjectStatus: '',
      mineProjects: false,
    });
  }, [updatePrefs]);

  const handleProjectStatusChange = useCallback(
    (value: string) => {
      setSelectedProjectStatus(value);
      updatePrefs({ selectedProjectStatus: value });
    },
    [updatePrefs],
  );

  const toggleMineProjects = useCallback(() => {
    setMineProjects((v) => {
      const next = !v;
      updatePrefs({ mineProjects: next });
      return next;
    });
  }, [updatePrefs]);

  const toggleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagIds((prev) => {
        const next = prev.includes(tagId)
          ? prev.filter((id) => id !== tagId)
          : [...prev, tagId];
        updatePrefs({ tagIds: next });
        return next;
      });
    },
    [updatePrefs],
  );

  const handleScopeChange = useCallback(
    (next: ScopeFilter) => {
      setScope(next);
      updatePrefs({ scope: next });
    },
    [updatePrefs],
  );

  const handleChannelChange = useCallback(
    (next: string | null) => {
      // Canal e segmento são mutuamente exclusivos no seletor.
      setSelectedChannelId(next);
      setSelectedSegmentId(null);
      updatePrefs({ selectedChannelId: next, selectedSegmentId: null });
    },
    [updatePrefs],
  );

  const handleSegmentChange = useCallback(
    (next: string | null) => {
      setSelectedSegmentId(next);
      setSelectedChannelId(null);
      updatePrefs({ selectedSegmentId: next, selectedChannelId: null });
    },
    [updatePrefs],
  );

  // Tree links apply existing filters after saved preferences have hydrated.
  useEffect(() => {
    if (!prefsLoaded || !navigationKey) return;
    const filters = new URLSearchParams(navigationKey);
    setConversationTab(filters.get('kind') === 'groups' ? 'groups' : 'all');
    setUnreadOnly(filters.get('box') === 'unread');
    setScope(filters.get('box') === 'mine' ? 'MINE' : 'ALL');
    setSelectedChannelId(filters.get('channel'));
    setSelectedSegmentId(null);
    setSelectedTagIds(filters.get('tag') ? [filters.get('tag')!] : []);
    setArchivedOnly(false);
    setSelectedProjectStatus('');
    setMineProjects(false);
    setSearch('');
    setDebouncedSearch('');
  }, [navigationKey, prefsLoaded]);

  const clearTreeSelection = useCallback(() => {
    if (navigationKey) router.replace('/inbox', { scroll: false });
  }, [navigationKey, router]);

  const tagsKey = useMemo(
    () => [...selectedTagIds].sort().join(','),
    [selectedTagIds],
  );
  const filterKey = `${unreadOnly ? 'u' : ''}|${archivedOnly ? 'a' : ''}|${showGroups ? 'g' : ''}|ps:${selectedProjectStatus}|mp:${mineProjects ? '1' : ''}|t:${tagsKey}`;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', orgId],
    queryFn: () => segmentsService.list(),
  });

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  // Drop selected tag ids that no longer exist (tag deleted in another tab).
  // Avoid sending stale ids to the backend — they'd just match nothing.
  useEffect(() => {
    if (!tags.length || !selectedTagIds.length) return;
    const valid = new Set(tags.map((t) => t.id));
    const filtered = selectedTagIds.filter((id) => valid.has(id));
    if (filtered.length !== selectedTagIds.length) {
      setSelectedTagIds(filtered);
      updatePrefs({ tagIds: filtered });
    }
  }, [tags, selectedTagIds, updatePrefs]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedSegmentId) ?? null,
    [segments, selectedSegmentId],
  );

  // Reset scroll when filters/search change
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, showGroups, tagsKey, activeTab]);

  const fetchList = (pageParam: number, pins?: string[]) => {
      const params: Record<string, string> = { limit: '30', page: String(pageParam) };
      if (unreadOnly) params.unread = 'true';
      // archived: dentro de view, só passa quando user explicitamente
      // ativou (override). Fora de view, passa sempre o estado atual.
      if (viewId) {
        if (archivedOnly) params.archived = 'only';
      } else {
        params.archived = archivedOnly ? 'only' : 'exclude';
      }
      // Filtros que unificam por grupo (segmento OU projeto) — são sempre
      // grupos: força groups=only e ignora o filtro de canal. Segmento tem
      // precedência se ambos estiverem ativos.
      const hasProjectFilter =
        !!selectedProjectStatus || (mineProjects && !!currentUserId);
      if (selectedSegmentId) {
        params.segmentId = selectedSegmentId;
        params.groups = 'only';
      } else if (hasProjectFilter) {
        if (selectedProjectStatus) params.projectStatus = selectedProjectStatus;
        if (mineProjects && currentUserId)
          params.responsibleUserId = currentUserId;
        if (activeTab !== 'projects' && activeTab !== 'mentorships') params.groups = 'only';
      } else {
        // groups: dentro de view, só override se user MARCOU "Grupos"
        // explicitamente (vira 'only' pra forçar). Fora de view, default
        // esconde grupos (regra do JP).
        if (viewId) {
          if (showGroups) params.groups = 'only';
        } else {
          if (!showGroups) params.groups = 'exclude';
        }
        if (selectedChannelId) params.channelId = selectedChannelId;
      }
      if (!selectedSegmentId && !hasProjectFilter) {
        if (activeTab === 'groups') params.groups = 'only';
        if (activeTab === 'people') params.groups = 'exclude';
      }
      if (activeTab === 'all' || activeTab === 'projects' || activeTab === 'mentorships') {
        if (!selectedSegmentId && (!hasProjectFilter || activeTab === 'projects' || activeTab === 'mentorships')) delete params.groups;
      }
      if (activeTab === 'projects') params.projectKind = 'ANY';
      if (activeTab === 'mentorships') params.projectKind = 'MENTORSHIP';
      if (pins) { params.ids = pins.join(','); params.limit = '20'; }
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      if (scope === 'MINE' && currentUserId) params.assignedToId = currentUserId;
      if (viewId) {
        return inboxViewsService.getConversations(viewId, params);
      }
      return inboxService.getConversations(params);
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['conversations', orgId, viewId ?? null, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, activeTab],
    queryFn: ({ pageParam = 1 }) => fetchList(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return lastPage.pagination.hasMore || (totalPages !== null && page < totalPages) ? page + 1 : undefined;
    },
    // Realtime (message:new / conversation:updated) drives updates while connected.
    // Poll every 60 s only while the socket is disconnected.
    refetchInterval: connected ? false : 60000,
    staleTime: 15000,
  });

  const { data: userPrefs } = useQuery({ queryKey: ['user-preferences', orgId], queryFn: preferencesService.get, enabled: !!orgId, staleTime: Infinity });
  const pins = userPrefs?.pinnedConversations ?? [];
  const pinIds = pins.map((pin) => pin.id);
  const { data: pinnedData } = useInfiniteQuery({
    queryKey: ['conversations', orgId, viewId ?? null, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, activeTab, 'pinned'],
    queryFn: () => fetchList(1, pinIds),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: !!orgId && !viewId && pinIds.length > 0,
  });
  useEffect(() => { if (pinIds.length) void queryClient.invalidateQueries({ queryKey: ['conversations', orgId, null, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, activeTab, 'pinned'], exact: true }); }, [orgId, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, activeTab, pinIds.join(',')]);

  const { data: jarvisDeskConv } = useQuery({
    queryKey: ['jarvis-desk-conversation', orgId],
    queryFn: async () => {
      const desk = await jarvisDeskService.open();
      const conv = await inboxService.getConversation(desk.conversationId);
      // GET /conversations/:id does not always include messages[];
      // the list renderer reads messages[0] and used to crash the page.
      return { ...conv, messages: conv.messages ?? [] };
    },
    enabled: !!orgId && !viewId,
    staleTime: 30_000,
  });

  const conversations = useMemo(() => {
    const pinned = viewId ? [] : (pinnedData?.pages.flatMap((page) => page.conversations) ?? []).filter((row) => pinIds.includes(row.id));
    const order = new Map(pins.map((pin) => [pin.id, pin.pinnedAt]));
    pinned.sort((a, b) => (order.get(b.id) ?? '').localeCompare(order.get(a.id) ?? ''));
    const ids = new Set(pinned.map((row) => row.id));
    return [...pinned, ...(data?.pages.flatMap((page) => page.conversations) ?? []).filter((row) => !ids.has(row.id))];
  }, [data, pinnedData, userPrefs, viewId]);

  // Total count from the paginated response — same value across pages
  // (it's the count(where) from Postgres). Used to show "Não lidas (N)"
  // in the active filter chip.
  const totalCount = data?.pages?.[0]?.pagination?.total ?? 0;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const handleConversationClick = useCallback(
    (conv: Conversation, index: number, e: React.MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (lastClickedIndex !== null && conversations.length > 0) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            for (let i = start; i <= end; i++) {
              next.add(conversations[i].id);
            }
          } else {
            next.add(conv.id);
          }
          return next;
        });
        setLastClickedIndex(index);
        return;
      }

      if (selectedIds.size > 0) {
        clearSelection();
      }
      onSelect(conv);
      setLastClickedIndex(index);

      // Mark as read on click. Optimistic: zero the local counter
      // immediately so the badge disappears before the API roundtrip;
      // backend then emits conversation:read via socket which becomes
      // a no-op for this user (counter is already 0) but syncs other
      // tabs/devices logged into the same account.
      if ((conv.unreadCount ?? 0) > 0) {
        const lastMsgId = conv.messages?.[0]?.id;

        // When the current list filters by "unread only" — either via the
        // local toggle on the main inbox or via a saved view that pins
        // unreadOnly — the conversation we just opened is no longer a
        // member of the filtered set. Optimistically drop it from the
        // cached pages so the user sees it leave immediately, instead of
        // waiting for the next refetch.
        let dropFromList = false;
        if (viewId) {
          const cachedViews = queryClient.getQueryData<InboxView[]>([
            'inbox-views',
          ]);
          dropFromList =
            cachedViews?.find((v) => v.id === viewId)?.filters?.unreadOnly ===
            true;
        } else {
          dropFromList = unreadOnly;
        }

        queryClient.setQueriesData<InfiniteData<ConversationPage>>(
          { queryKey: ['conversations'] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                conversations: dropFromList
                  ? p.conversations.filter(
                      (c: Conversation) => c.id !== conv.id,
                    )
                  : p.conversations.map((c: Conversation) =>
                      c.id === conv.id ? { ...c, unreadCount: 0 } : c,
                    ),
                // Keep `total` honest when dropping — the unread badge in
                // the sidebar reads from it and would otherwise be stale.
                ...(dropFromList && p.pagination
                  ? {
                      pagination: {
                        ...p.pagination,
                        total: Math.max(0, (p.pagination.total ?? 1) - 1),
                      },
                    }
                  : {}),
              })),
            };
          },
        );
        inboxService.markAsRead(conv.id, lastMsgId).catch(() => {
          // Server rejected — refetch to roll back.
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
      }
    },
    [
      lastClickedIndex,
      conversations,
      selectedIds.size,
      clearSelection,
      onSelect,
      queryClient,
      orgId,
      viewId,
      unreadOnly,
    ],
  );

  const toggleSelect = useCallback((id: string, index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastClickedIndex(index);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  // Realtime: refresh list on inbound messages, imported conversations, or
  // state transitions (assign/close/reopen/transfer).
  useEffect(() => {
    const unsubNew = on('message:new', (payload: Parameters<typeof receiveMessage>[1]) => {
      receiveMessage(queryClient, payload, activeId);
    });
    const unsubImported = on('conversation:imported', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const unsubUpdated = on('conversation:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // When the same user reads a conversation in another tab/device, zero
    // the badge here too without a full refetch.
    const unsubRead = on('conversation:read', (payload: { conversationId?: string; unreadCount?: number }) => {
      const id = payload?.conversationId;
      if (!id) return;
      queryClient.setQueriesData<InfiniteData<ConversationPage>>(
        { queryKey: ['conversations'] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              conversations: p.conversations.map((c: Conversation) =>
                c.id === id ? { ...c, unreadCount: 0 } : c,
              ),
            })),
          };
        },
      );
    });
    // Mirror of conversation:read for the "mark as unread" action — keeps
    // other tabs/devices for the same user in sync with the new badge.
    const unsubUnread = on('conversation:unread', (payload: { conversationId?: string; unreadCount?: number }) => {
      const id = payload?.conversationId;
      if (!id) return;
      const count = Number(payload?.unreadCount) || 1;
      queryClient.setQueriesData<InfiniteData<ConversationPage>>(
        { queryKey: ['conversations'] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              conversations: p.conversations.map((c: Conversation) =>
                c.id === id ? { ...c, unreadCount: count } : c,
              ),
            })),
          };
        },
      );
      // Refetch so the conversation re-enters an "unread only" view it
      // had previously dropped from.
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // Reconnect: any events that fired while we were offline are gone, so
    // sync the list from scratch when the socket comes back.
    const unsubReconnect = onReconnect(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-views'] });
    });
    return () => {
      unsubNew?.();
      unsubImported?.();
      unsubUpdated?.();
      unsubRead?.();
      unsubUnread?.();
      unsubReconnect?.();
    };
  }, [on, onReconnect, queryClient, activeId]);

  const handleBulkAction = useCallback(
    async (action: 'close' | 'assign' | 'reopen') => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        if (action === 'close') await inboxService.bulkClose(ids);
        else if (action === 'assign') await inboxService.bulkAssignToMe(ids);
        else if (action === 'reopen') await inboxService.bulkReopen(ids);
        clearSelection();
        invalidateConversations();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  const handleBulkSetAi = useCallback(
    async (override: boolean | null) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        await inboxService.bulkSetAi(ids, override);
        const label =
          override === null
            ? 'IA voltou ao padrão'
            : override
              ? 'IA forçada'
              : 'IA pausada';
        toast.success(`${label} em ${ids.length} conversa${ids.length > 1 ? 's' : ''}`);
        clearSelection();
        invalidateConversations();
      } catch (err: unknown) {
        toast.error((isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) || 'Erro ao alterar IA em massa');
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  const handleBulkEngageAi = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await inboxService.bulkEngageAi(ids);
      toast.success(
        `IA engajada em ${ids.length} conversa${ids.length > 1 ? 's' : ''}`,
      );
      clearSelection();
      invalidateConversations();
    } catch (err: unknown) {
      toast.error((isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) || 'Erro ao engajar IA');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, invalidateConversations]);

  // Bulk: drop selected conversations into a pipeline stage. Each
  // conversation becomes a Card on (pipelineId, stageId). Uses
  // allSettled so a single failure (e.g. duplicate) doesn't abort the
  // batch — toast aggregates the result.
  const handleBulkAddToPipeline = useCallback(
    async (pipelineId: string, stageId: string) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        const results = await Promise.allSettled(
          ids.map((conversationId) =>
            pipelinesService.createCard(pipelineId, {
              conversationId,
              stageId,
            }),
          ),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - ok;
        if (failed === 0) {
          toast.success(
            `${ok} conversa${ok > 1 ? 's' : ''} adicionada${ok > 1 ? 's' : ''} ao pipeline`,
          );
        } else if (ok === 0) {
          toast.error(`Falha ao adicionar (${failed} ${failed > 1 ? 'erros' : 'erro'})`);
        } else {
          toast.warning(`${ok} adicionadas, ${failed} falharam`);
        }
        clearSelection();
        invalidateConversations();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  // Bulk: pin the selected conversations into a brand-new inbox view.
  // Asks for the inbox name with a quick prompt (no full dialog overhead),
  // creates the view with conversationIds=selected, then navigates to it.
  const handleCreateInboxFromSelection = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const defaultName = `Seleção ${new Date().toLocaleDateString('pt-BR')}`;
    const name = window.prompt(
      `Nome da nova inbox (com as ${ids.length} conversas selecionadas):`,
      defaultName,
    );
    if (!name || !name.trim()) return;
    setBulkLoading(true);
    try {
      const view = await inboxViewsService.create({
        name: name.trim(),
        icon: 'Star',
        color: 'amber',
        filters: { conversationIds: ids },
      });
      toast.success(`Inbox "${view.name}" criada com ${ids.length} conversas`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['inbox-views'] });
      router.push(`/inbox?view=${view.id}`);
    } catch (err: unknown) {
      toast.error((isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) || 'Erro ao criar inbox');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, queryClient, router]);

  const getLastMessagePreview = (conv: Conversation) => {
    const last = conv.messages?.[0];
    if (!last) return 'Sem mensagens';
    const prefix = last.direction === 'OUTBOUND' ? 'Você: ' : '';
    const rt = (last as typeof last & { metadata?: MessageMetadata }).metadata?.replyTo;
    const storyPrefix = rt?.story
      ? rt.story.kind === 'mention'
        ? '📸 Mencionou no story · '
        : '📸 Respondeu seu story · '
      : rt?.ad
        ? '📢 Respondeu ao anúncio · '
        : '';
    return prefix + storyPrefix + (last.content?.text || `[${last.type}]`);
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 24) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    // w-full: a largura agora é controlada pelo wrapper externo
    // (`InboxLayout` via react-resizable-panels). O `min-w-0` é
    // load-bearing junto com o flex-col — sem ele, `truncate` interno
    // dos nomes longos não funciona porque o flex item assume o
    // intrinsic content-width como mínimo.
    <div className="flex h-full w-full min-w-0 flex-col border-r border-[var(--bq-hair)] bg-[var(--bq-win-solid)]  ">
      <div className="bq-list-heading"><h1>Conversas</h1><span className="text-[11px] font-normal text-[var(--bq-t3)]">{data?.pages[0]?.pagination.total ?? '—'}</span>{jarvisDeskConv && <button type="button" className="bq-button ml-auto" aria-label="Abrir conversa com o Synq Agent" title="Abrir conversa com o Synq Agent" onClick={() => onSelect(jarvisDeskConv)}><MessageSquare size={14} /></button>}</div>
      {/* Search + Filter */}
      <div onClickCapture={clearTreeSelection} onChangeCapture={clearTreeSelection} className="bq-list-search flex items-center gap-1.5">
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bq-t3)] transition-colors group-focus-within:text-primary" />
          <input
            ref={searchRef}
            type="text"
            aria-label="Buscar conversas"
            placeholder="Buscar nesta caixa"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border-0 bg-[var(--bq-raised)] py-1.5 pl-8 pr-8 text-[13px] text-[var(--bq-t1)] outline-none ring-1 ring-transparent transition-all placeholder:text-[var(--bq-t3)] focus:bg-[var(--bq-win-solid)] focus:ring-primary/30 focus:shadow-sm   dark:placeholder:text-[var(--bq-t2)]  dark:focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => { handleSearchChange(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--bq-t3)] transition-colors hover:text-[var(--bq-t2)] "
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Popover className="relative">
          <PopoverButton
            aria-label="Filtros de conversas"
            // Filtros funcionam sempre — dentro ou fora de uma view. Quando
            // dentro de view, eles agem como override em cima dos filtros
            // salvos da view (backend faz o merge no /inbox-views/:id/conv).
            className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-md transition-colors outline-none data-[open]:bg-[var(--bq-raised)] data-[open]:text-[var(--bq-t2)]   ${
              activeFilterCount > 0
                ? 'bg-primary/10 text-primary dark:bg-primary/20 data-[open]:bg-primary/10 data-[open]:text-primary dark:data-[open]:bg-primary/20 dark:data-[open]:text-primary'
                : 'text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t2)]  '
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </PopoverButton>

          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1.5 w-64 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0   [--anchor-gap:0.25rem]"
          >
            <div>
              <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--bq-t3)] ">
                Filtros
              </p>
              {filterOptions.map((f) => {
                const isActive =
                  f.value === 'unread'
                    ? unreadOnly
                    : f.value === 'archived'
                      ? archivedOnly
                      : showGroups;
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => toggleListFilter(f.value)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                      isActive
                        ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                        : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                    }`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-white'
                        : 'border-[var(--bq-hair-strong)] '
                    }`}>
                      {isActive && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 leading-tight">
                      <span className="block">{f.label}</span>
                      <span className="block text-[10px] font-normal text-[var(--bq-t3)] ">
                        {f.description}
                      </span>
                    </span>
                  </button>
                );
              })}
              {/* ─── Projeto ─── */}
              <div className="mx-2 my-1 border-t border-[var(--bq-hair)] " />
              <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--bq-t3)] ">
                Projeto
              </p>
              <div className="px-2.5 pb-1.5">
                <select
                  value={selectedProjectStatus}
                  onChange={(e) => handleProjectStatusChange(e.target.value)}
                  className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] px-2 py-1.5 text-[12px] text-[var(--bq-t2)] outline-none focus:border-primary focus:ring-1 focus:ring-primary   "
                >
                  <option value="">Status: todos</option>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PHASE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={toggleMineProjects}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  mineProjects
                    ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                    : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    mineProjects
                      ? 'border-primary bg-primary text-white'
                      : 'border-[var(--bq-hair-strong)] '
                  }`}
                >
                  {mineProjects && <Check className="h-2.5 w-2.5" />}
                </div>
                <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 leading-tight">Meus projetos</span>
              </button>

              {tags.length > 0 && (
                <>
                  <div className="mx-2 my-1 border-t border-[var(--bq-hair)] " />
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--bq-t3)] ">
                      Tags
                    </p>
                    {selectedTagIds.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedTagIds([]);
                          updatePrefs({ tagIds: [] });
                        }}
                        className="text-[10px] text-[var(--bq-t3)] transition-colors hover:text-[var(--bq-t2)] "
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="px-1.5 pb-1">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--bq-t3)]" />
                      <input
                        type="text"
                        placeholder="Buscar tag..."
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        // Headless UI fecha o popover quando o foco vaza ou
                        // quando ESC sobe — paramos a propagação pra ESC
                        // limpar o campo sem fechar tudo.
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && tagSearch) {
                            e.stopPropagation();
                            setTagSearch('');
                          }
                        }}
                        className="w-full rounded-md border-0 bg-[var(--bq-raised)] py-1 pl-7 pr-7 text-[12px] text-[var(--bq-t1)] outline-none ring-1 ring-transparent transition-all placeholder:text-[var(--bq-t3)] focus:bg-[var(--bq-win-solid)] focus:ring-primary/30   dark:placeholder:text-[var(--bq-t2)] "
                      />
                      {tagSearch && (
                        <button
                          onClick={() => setTagSearch('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--bq-t3)] transition-colors hover:text-[var(--bq-t2)] "
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto scrollbar-thin">
                    {filteredTags.length === 0 ? (
                      <p className="px-2.5 py-2 text-center text-[11px] text-[var(--bq-t3)] ">
                        Nenhuma tag encontrada
                      </p>
                    ) : (
                      filteredTags.map((tag) => {
                        const isActive = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTagFilter(tag.id)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                              isActive
                                ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                                : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                isActive
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-[var(--bq-hair-strong)] '
                              }`}
                            >
                              {isActive && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="flex-1 truncate">{tag.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
              {activeFilterCount > 0 && (
                <>
                  <div className="mx-2 my-1 border-t border-[var(--bq-hair)] " />
                  <button
                    onClick={clearListFilters}
                    className="flex w-full items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] text-[var(--bq-t3)] transition-colors hover:bg-[var(--bq-surface)] hover:text-[var(--bq-t2)]  "
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </button>
                </>
              )}
            </div>
          </PopoverPanel>
        </Popover>
      </div>

      <div onClickCapture={clearTreeSelection} className="bq-list-segments"><SegmentedControl<ConversationTab> label="Tipo de conversa" value={conversationTab ?? (showGroups ? 'all' : 'people')} onChange={(tab) => { setConversationTab(tab); clearSelection(); }} options={[{value:'all',label:'Todas'}, {value:'people',label:'Pessoas'}, {value:'groups',label:'Grupos'}, {value:'projects',label:'Projetos'}, {value:'mentorships',label:'Mentorias'}]} /></div>
      {/* Channel selector — hidden when an inbox view is active, since the
          view already pins the channel(s) via its saved filters. Letting
          the user override here would just confuse the result. */}
      {!viewId && (
      <div onClickCapture={clearTreeSelection} className="bq-list-channel px-3 pb-2">
        <Popover className="relative">
          <PopoverButton className="flex max-w-full items-center gap-2 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-2.5 py-1 text-left text-[11.5px] text-[var(--bq-t2)] outline-none transition-colors hover:bg-[var(--bq-surface)] data-[open]:border-primary/40 data-[open]:bg-[var(--bq-surface)]     ">
            {(() => {
              const Icon = selectedSegment
                ? Layers
                : selectedChannel
                  ? channelIcons[selectedChannel.type] || MessageSquare
                  : Inbox;
              return <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--bq-t2)] " />;
            })()}
            <span className="flex-1 truncate font-medium">
              {selectedSegment
                ? selectedSegment.name
                : selectedChannel
                  ? selectedChannel.name
                  : 'Todos os canais'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--bq-t3)]" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-50 mt-1.5 w-64 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0   [--anchor-gap:0.25rem]"
          >
            {({ close }) => (
              <>
                {(() => {
                  const allActive = selectedChannelId === null && selectedSegmentId === null;
                  return (
                    <button
                      onClick={() => { handleChannelChange(null); close(); }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                        allActive
                          ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                          : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                      }`}
                    >
                      <Inbox className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">Todos os canais</span>
                      {allActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })()}
                {channels.length > 0 && (
                  <div className="mx-2 my-1 border-t border-[var(--bq-hair)] " />
                )}
                {channels.map((channel) => {
                  const Icon = channelIcons[channel.type] || MessageSquare;
                  const isActive = selectedChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => { handleChannelChange(channel.id); close(); }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                        isActive
                          ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                          : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{channel.name}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
                {segments.length > 0 && (
                  <>
                    <div className="mx-2 my-1 border-t border-[var(--bq-hair)] " />
                    <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)] ">
                      Segmentos
                    </p>
                    {segments.map((segment) => {
                      const isActive = selectedSegmentId === segment.id;
                      return (
                        <button
                          key={segment.id}
                          onClick={() => { handleSegmentChange(segment.id); close(); }}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                            isActive
                              ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                              : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate">{segment.name}</span>
                          {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </PopoverPanel>
        </Popover>
      </div>
      )}

      <div onClickCapture={clearTreeSelection} className="bq-list-chips">
        <button type="button" className="bq-button" aria-pressed={unreadOnly} onClick={() => toggleListFilter('unread')}>Não lidas</button>
        <button type="button" className="bq-button" disabled={!responseView} title={responseView ? 'Abrir caixa de mensagens sem resposta' : 'Configure uma caixa com última mensagem recebida'} onClick={() => responseView && router.push(`/inbox?view=${responseView.id}`)}>Sem resposta</button>
        <button type="button" className="bq-button" aria-pressed={scope === 'MINE'} disabled={!currentUserId} onClick={() => handleScopeChange(scope === 'MINE' ? 'ALL' : 'MINE')}>Minhas</button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {filterOptions.map((option) => {
            const isActive =
              option.value === 'unread' ? unreadOnly : option.value === 'groups' ? showGroups : archivedOnly;
            if (!isActive) return null;
            return (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20"
              >
                {option.label}
                {option.value === 'unread' && (
                  <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold leading-none py-[3px] dark:bg-primary/30">
                    {totalCount}
                  </span>
                )}
                <button
                  onClick={() => toggleListFilter(option.value)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {selectedTagIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                title={`Filtrando por tag: ${tag.name}`}
                className="bq-inbox-tag"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                <button
                  onClick={() => toggleTagFilter(tag.id)}
                  className="rounded-full p-0.5 transition-colors"
                  style={{ backgroundColor: `${tag.color}14` }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {activeFilterCount > 1 && (
            <button
              onClick={clearListFilters}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-[var(--bq-t3)] transition-colors hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t2)]  "
            >
              <X className="h-2.5 w-2.5" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 border-t border-b border-[var(--bq-hair)] bg-primary/4 px-3 py-1.5  dark:bg-primary/10">
          <button
            onClick={clearSelection}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--bq-t3)] hover:text-[var(--bq-t2)] "
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="text-[12px] font-medium text-[var(--bq-t2)] ">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={selectAll}
            className="text-[11px] text-primary hover:underline"
          >
            Todas
          </button>
          <div className="flex-1" />
          <button
            onClick={handleCreateInboxFromSelection}
            disabled={bulkLoading}
            title="Criar inbox com selecionadas"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--bq-t2)] transition-colors hover:bg-[var(--bq-warn-soft)] hover:text-[var(--bq-warn)] disabled:opacity-50 "
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <BulkAiPopover
            count={selectedIds.size}
            disabled={bulkLoading}
            onSetOverride={handleBulkSetAi}
            onEngage={handleBulkEngageAi}
          />
          <BulkPipelinePopover
            count={selectedIds.size}
            disabled={bulkLoading}
            onConfirm={handleBulkAddToPipeline}
          />
          <button
            onClick={() => handleBulkAction('assign')}
            disabled={bulkLoading}
            title="Assumir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--bq-t2)] transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('close')}
            disabled={bulkLoading}
            title="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--bq-t2)] transition-colors hover:bg-[var(--bq-err-soft)] hover:text-[var(--bq-err)] disabled:opacity-50 "
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('reopen')}
            disabled={bulkLoading}
            title="Reabrir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--bq-t2)] transition-colors hover:bg-[var(--bq-ok-soft)] hover:text-[var(--bq-ok)] disabled:opacity-50 "
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Divider */}
      {selectedIds.size === 0 && (
        <div className="mx-3 border-t border-[var(--bq-hair)] " />
      )}

      {/* Conversation list */}
      <div ref={scrollContainerRef} className="bq-conversation-rows min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-3 py-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--bq-raised)] " />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-[var(--bq-raised)] " />
                <div className="h-3 w-36 animate-pulse rounded bg-[var(--bq-surface)] " />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bq-raised)] ">
              <MessageSquare className="h-6 w-6 text-[var(--bq-t3)] " />
            </div>
            <p className="mt-3 text-[13px] font-medium text-[var(--bq-t3)] ">
              {activeTab === 'mentorships'
                ? 'Nenhuma conversa de mentoria. Marque o projeto da conversa como Mentoria no cabeçalho.'
                : activeTab === 'projects'
                  ? 'Nenhuma conversa com projeto. Vincule um projeto à conversa no cabeçalho.'
                  : 'Nenhuma conversa encontrada'}
            </p>
            {(activeFilterCount > 0 || search) && (
              <button
                onClick={() => { clearListFilters(); handleSearchChange(''); }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {<VirtualList items={conversations} itemKey={(conv) => conv.id} scrollRef={scrollContainerRef} estimate={84} renderItem={(conv, index) => {
              const isActive = conv.id === activeId;
              const isSelected = selectedIds.has(conv.id);
              const inSelectionMode = selectedIds.size > 0;
              return (
                <button
                  key={conv.id}
                  onClick={(e) => handleConversationClick(conv, index, e)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      conversation: conv,
                      position: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  data-selected={isSelected || isActive} data-unread={(conv.unreadCount ?? 0) > 0}
                  className={`bq-conversation-row group w-full text-left transition-colors duration-100 ${
                    isSelected
                      ? 'bg-[var(--bq-raised-2)]'
                      : isActive
                        ? 'bg-[var(--bq-raised-2)]'
                        : 'hover:bg-[var(--bq-surface)] '
                  }`}
                >
                  <div className="group/avatar relative shrink-0">
                    {/* Avatar visível por padrão; some no hover (ou se está selecionado / em selection mode) pra dar lugar à checkbox. */}
                    <div
                      className={`${
                        inSelectionMode || isSelected
                          ? 'invisible'
                          : 'group-hover/avatar:invisible'
                      }`}
                    >
                      <ListAvatar
                        name={conv.contact.name}
                        avatarUrl={conv.contact.avatarUrl}
                        isGroup={conv.isGroup}
                      />
                    </div>
                    {/* Checkbox: aparece no hover sempre, fica visível travada
                        quando já tem seleção ativa ou esse item é parte dela. */}
                    <div
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(conv.id, index);
                      }}
                      className={`absolute inset-0 flex size-bq-size-avatar-row cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white opacity-100'
                          : inSelectionMode
                            ? 'border-[var(--bq-hair-strong)] bg-[var(--bq-raised)] text-transparent hover:border-primary/50  '
                            : 'border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] text-transparent opacity-0 hover:border-primary/50 group-hover/avatar:opacity-100  '
                      }`}
                      title={isSelected ? 'Desmarcar' : 'Selecionar'}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {(() => {
                      const ChannelIcon = channelIcons[conv.channel.type] || MessageSquare;
                      return (
                        <div className="bq-channel-badge" style={{ "--bq-channel-color": `var(--bq-${conv.channel.type.startsWith("WHATSAPP") ? "wa" : conv.channel.type === "INSTAGRAM" ? "ig" : conv.channel.type === "GMAIL" ? "mail" : "t3"})` } as React.CSSProperties}>
                          {conv.channel.type.startsWith('WHATSAPP') ? (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                          ) : conv.channel.type === 'INSTAGRAM' ? (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="5" /><circle cx="12" cy="12" r="4" /></svg>
                          ) : <ChannelIcon />}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bq-row-main">
                    <div className="flex items-baseline gap-2">
                      <span className="bq-row-name min-w-0 flex-1 truncate" title={conv.contact.name || conv.contact.phone || undefined}>{conv.contact.name || conv.contact.phone || 'Desconhecido'}</span>
                      {!viewId && pinIds.includes(conv.id) && <Pin aria-label="Conversa fixada" size={14} />}
                      <span className="bq-row-time shrink-0">{formatTime(conv.messages?.[0]?.createdAt ?? conv.lastMessageAt)}</span>
                      <span className="sr-only">{conv.status}</span>
                    </div>
                    <p className="bq-row-preview truncate">{getLastMessagePreview(conv)}</p>
                    <div className="bq-row-foot">
                      {[...(conv.tags ?? []), ...(conv.contact.tags?.filter(t => !conv.tags?.some(({tag}) => tag.id === t.tag.id)) ?? [])].map(({tag}) => <span key={tag.id} className="bq-inbox-tag" title={tag.name}><span className="bq-nav-dot" style={{backgroundColor: tag.color}} /><span className="truncate">{tag.name}</span></span>)}
                      {conv.isGroup && <span className="bq-inbox-tag">Grupo</span>}
                      {(conv.unreadCount ?? 0) > 0 && <span className="bq-unread-count" aria-label={`${conv.unreadCount} mensagens não lidas`}>{conv.unreadCount}</span>}
                    </div>
                  </div>
                </button>
              );
            }} />}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--bq-t3)]" />
              </div>
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ConversationContextMenu
          conversation={contextMenu.conversation}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
