'use client';

import { useState, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, ChevronDown, Plus, MessageSquare, Users, Tag, User, Clock, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { inboxViewsService, type InboxView } from '@/features/inbox-views/services/inbox-views.service';
import { InboxViewDialog } from '@/features/inbox-views/components/inbox-view-dialog';
import { channelsService } from '@/features/channels/services/channels.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';

/** Navigation uses the same server filters as the conversation list, never a loaded-page subset. */
export function InboxTree() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const orgId = useOrgId();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InboxView | null>(null);
  const { data: views = [] } = useQuery({ queryKey: ['inbox-views'], queryFn: () => inboxViewsService.list(), staleTime: 60_000 });
  const { data: channels = [] } = useQuery({ queryKey: ['channels', orgId], queryFn: () => channelsService.list(), staleTime: 60_000 });
  const { data: tags = [] } = useQuery({ queryKey: ['tags', orgId], queryFn: () => tagsService.list(), staleTime: 60_000 });
  const groupQuery = useInfiniteQuery({
    queryKey: ['inbox-navigation-groups', orgId],
    queryFn: ({ pageParam = 1 }) => inboxService.getConversations({ groups: 'only', archived: 'exclude', page: String(pageParam), limit: '30' }),
    initialPageParam: 1,
    getNextPageParam: page => page.pagination.hasMore || (page.pagination.totalPages !== null && page.pagination.page < page.pagination.totalPages) ? page.pagination.page + 1 : undefined,
    staleTime: 60_000,
  });
  const groupConversations = groupQuery.data?.pages.flatMap(page => page.conversations) ?? [];
  const go = (filters: Record<string, string>) => router.push(`/inbox?${new URLSearchParams({ box: 'all', ...filters })}`);
  const remove = async (view: InboxView) => {
    if (!confirm(`Excluir inbox "${view.name}"?`)) return;
    try { await inboxViewsService.remove(view.id); toast.success('Inbox removida'); qc.invalidateQueries({ queryKey: ['inbox-views'] }); }
    catch (error) { toast.error(inboxErrorMessage(error, 'Erro ao excluir')); }
  };
  const saved = (items: InboxView[]) => items.map(view => <div className="group flex min-w-0 items-center" key={view.id}>
    <NavItem label={view.name} icon={Inbox} active={params.get('view') === view.id} onClick={() => router.push(`/inbox?view=${view.id}`)} />
    {view.metadata?.builtin !== true && <div className="flex shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
      <button type="button" className="p-1" aria-label={`Editar ${view.name}`} onClick={() => setEditing(view)}><Pencil size={12} /></button>
      <button type="button" className="p-1" aria-label={`Excluir ${view.name}`} onClick={() => remove(view)}><Trash2 size={12} /></button>
    </div>}
  </div>);
  const responseView = views.find(view => view.filters.lastDirection === 'inbound');
  const groups = views.filter(view => view.filters.kind === 'GROUP');
  const holdingTag = tags.find(tag => tag.name.toLocaleLowerCase('pt-BR') === 'holding');
  return <nav aria-label="Caixas e canais" className="space-y-4 text-[var(--bq-t2)]">
    <NavSection title="Caixas" persist>
      <NavItem label="Todas" icon={Inbox} active={!params.get('view') && (!params.get('box') || params.get('box') === 'all') && !params.get('channel') && !params.get('tag') && !params.get('kind')} onClick={() => go({})} />
      <NavItem label="Não lidas" icon={MessageSquare} active={params.get('box') === 'unread'} onClick={() => go({ box: 'unread' })} />
      <NavItem label="Minhas" icon={User} active={params.get('box') === 'mine'} onClick={() => go({ box: 'mine' })} />
      <NavItem label="Sem resposta" icon={Clock} active={!!responseView && params.get('view') === responseView.id} disabled={!responseView} title={!responseView ? 'Configure uma caixa com última mensagem recebida para usar este filtro' : undefined} onClick={() => responseView && router.push(`/inbox?view=${responseView.id}`)} />
      {saved(views.filter(view => view.filters.kind !== 'GROUP'))}
      <NavItem label="Nova inbox" icon={Plus} onClick={() => setCreating(true)} />
    </NavSection>
    <NavSection title="Canais">
      {channels.map(channel => <NavItem key={channel.id} label={channel.name} icon={MessageSquare} active={params.get('channel') === channel.id} onClick={() => go({ channel: channel.id })} />)}
      {!channels.length && <Empty>Sem canais disponíveis.</Empty>}
    </NavSection>
    <NavSection title="Grupos">
      <NavItem label="Todos os grupos" icon={Users} active={params.get('kind') === 'groups' && !params.get('tag')} onClick={() => go({ kind: 'groups' })} />
      {saved(groups)}
      {groupConversations.map(conversation => <NavItem key={conversation.id} label={conversation.contact.name || conversation.contact.phone || 'Grupo'} icon={Users} active={params.get('conversationId') === conversation.id} onClick={() => router.push(`/inbox?conversationId=${encodeURIComponent(conversation.id)}`)} />)}
      {groupQuery.hasNextPage && <NavItem label={groupQuery.isFetchingNextPage ? 'Carregando…' : 'Mais grupos'} icon={Plus} disabled={groupQuery.isFetchingNextPage} onClick={() => { void groupQuery.fetchNextPage(); }} />}
      {groupQuery.isError ? <Empty>Não foi possível carregar os grupos.</Empty> : groupQuery.isLoading ? <Empty>Carregando grupos…</Empty> : !groupConversations.length && <Empty>Sem grupos disponíveis.</Empty>}
    </NavSection>
    <NavSection title="Holdings">
      {holdingTag ? <NavItem label="Grupos com etiqueta Holding" icon={Users} active={params.get('tag') === holdingTag.id} onClick={() => go({ kind: 'groups', tag: holdingTag.id })} /> : <Empty>Sem etiqueta Holding cadastrada.</Empty>}
      <Empty>Fases das holdings ainda não disponíveis nesta navegação.</Empty>
    </NavSection>
    <NavSection title="Etiquetas">
      {tags.map(tag => <NavItem key={tag.id} label={tag.name} icon={Tag} active={params.get('tag') === tag.id} onClick={() => go({ tag: tag.id })} />)}
      {!tags.length && <Empty>Sem etiquetas cadastradas.</Empty>}
    </NavSection>
    <InboxViewDialog open={creating} view={null} onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['inbox-views'] }); setCreating(false); }} />
    <InboxViewDialog open={!!editing} view={editing} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['inbox-views'] }); setEditing(null); }} />
  </nav>;
}

function NavSection({ title, children, persist = false }: { title: string; children: ReactNode; persist?: boolean }) {
  const [open, setOpen] = useState(() => !persist || typeof window === 'undefined' || localStorage.getItem('inbox-tree-expanded') !== '0');
  return <section><button type="button" className="flex w-full items-center justify-between px-2 py-2 text-[10.5px] font-medium uppercase tracking-[.08em] text-[var(--bq-t3)]" aria-expanded={open} onClick={() => { setOpen(!open); if (persist) localStorage.setItem('inbox-tree-expanded', open ? '0' : '1'); }}>{title}<ChevronDown size={12} className={open ? '' : '-rotate-90'} /></button>{open && <div>{children}</div>}</section>;
}
function NavItem({ label, icon: Icon, active, disabled, title, onClick }: { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; title?: string; onClick: () => void }) {
  return <button type="button" title={title || label} disabled={disabled} aria-current={active ? 'page' : undefined} onClick={onClick} className={`flex min-w-0 flex-1 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] disabled:opacity-45 ${active ? 'bg-[var(--bq-raised-2)] text-[var(--bq-t1)]' : 'hover:bg-[var(--bq-raised)]'}`}><Icon size={14} className="shrink-0" /><span className="truncate">{label}</span></button>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="px-2 py-1 text-[11px] leading-relaxed text-[var(--bq-t3)]">{children}</p>; }
