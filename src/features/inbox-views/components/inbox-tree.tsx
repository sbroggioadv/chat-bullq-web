'use client';

import { useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox,
  ChevronRight,
  ChevronDown,
  Plus,
  MessageSquare,
  Phone,
  Instagram,
  Mail,
  Send,
  Users,
  Tag,
  Star,
  Filter,
  Pencil,
  Trash2,
  Archive,
  MailOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  inboxViewsService,
  type InboxView,
} from '../services/inbox-views.service';
import { InboxViewDialog } from './inbox-view-dialog';

const VIEW_ICON: Record<string, any> = {
  Inbox,
  MessageSquare,
  Phone,
  Instagram,
  Mail,
  MailOpen,
  Send,
  Users,
  Tag,
  Star,
  Filter,
  Archive,
};

const COLOR_CLS: Record<string, string> = {
  default: 'text-sidebar-foreground/60',
  green: 'text-green-600 dark:text-green-400',
  pink: 'text-pink-600 dark:text-pink-400',
  violet: 'text-violet-600 dark:text-violet-400',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
};

const STORAGE_KEY = 'inbox-tree-expanded';

export function InboxTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  // Programmatic navigation that GUARANTEES the query string resets when
  // jumping back to "Geral" from a custom view. <Link href="/inbox"> on its
  // own keeps `?view=…` in the URL because Next treats same-pathname clicks
  // as a no-op for query params.
  const goGeral = () => router.push('/inbox');
  const goView = (id: string) => router.push(`/inbox?view=${id}`);
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InboxView | null>(null);

  const { data: views = [] } = useQuery({
    queryKey: ['inbox-views'],
    queryFn: () => inboxViewsService.list(),
    staleTime: 60000,
  });

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  };

  const isInbox = pathname === '/inbox' || pathname?.startsWith('/inbox');
  const activeViewId = searchParams.get('view');

  const handleDelete = async (view: InboxView) => {
    if (!confirm(`Excluir inbox "${view.name}"?`)) return;
    try {
      await inboxViewsService.remove(view.id);
      toast.success('Inbox removida');
      qc.invalidateQueries({ queryKey: ['inbox-views'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          className="flex h-7 w-5 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={goGeral}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
            isInbox && !activeViewId
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Inbox className="size-5" />
          <span className="flex-1">Inbox</span>
        </button>
      </div>

      {expanded && (
        <div className="ml-5 space-y-0.5 border-l border-sidebar-border pl-2">
          <button
            type="button"
            onClick={goGeral}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              isInbox && !activeViewId
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
          >
            <Inbox className="size-3.5 text-sidebar-foreground/50" />
            <span className="flex-1">Geral</span>
          </button>

          {views.map((v) => {
            const Icon = VIEW_ICON[v.icon ?? ''] ?? Filter;
            const colorCls = COLOR_CLS[v.color ?? 'default'] ?? COLOR_CLS.default;
            const isActive = activeViewId === v.id && isInbox;
            const isBuiltin = v.metadata?.builtin === true;
            return (
              <div
                key={v.id}
                className={`group flex items-center gap-1 rounded-md ${
                  isActive
                    ? 'bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => goView(v.id)}
                  className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                    isActive
                      ? 'font-medium text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground'
                  }`}
                  title={v.name}
                >
                  <Icon className={`size-3.5 ${colorCls}`} />
                  <span className="flex-1 truncate">{v.name}</span>
                </button>
                {!isBuiltin && (
                  <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(v)}
                      aria-label="Editar"
                      className="flex size-6 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      aria-label="Excluir"
                      className="mr-1 flex size-6 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <Plus className="size-3.5" />
            <span>Nova inbox</span>
          </button>
        </div>
      )}

      <InboxViewDialog
        open={creating}
        view={null}
        onClose={() => setCreating(false)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['inbox-views'] });
          setCreating(false);
        }}
      />
      <InboxViewDialog
        open={!!editing}
        view={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['inbox-views'] });
          setEditing(null);
        }}
      />
    </div>
  );
}
