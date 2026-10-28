'use client';

import { useId, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  KanbanSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Filter,
} from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { Button } from '@/components/ui/foundation';

const STORAGE_KEY = 'pipelines-tree-expanded';

const COLOR_CLS: Record<string, string> = {
  default: 'text-[var(--bq-t3)]',
  green: 'text-[var(--bq-ok)]',
  pink: 'text-[var(--bq-ig)]',
  violet: 'text-[var(--bq-agent)]',
  blue: 'text-[var(--bq-info)]',
  amber: 'text-[var(--bq-warn)]',
  red: 'text-[var(--bq-err)]',
};

/**
 * Sidebar tree for Pipelines — header opens the list page, children are
 * each non-archived pipeline going to /pipelines/[id]. Mirrors the
 * pattern of InboxTree / JarvisTree so the user gets a consistent
 * navigation surface across the app.
 */
export function PipelinesTree() {
  const itemsId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });

  const visible = pipelines.filter((p) => !p.archived);

  const isPipelinesRoot = pathname === '/pipelines';
  const activePipelineId = (() => {
    const m = pathname?.match(/^\/pipelines\/([^/]+)/);
    return m?.[1] ?? null;
  })();
  const isPipelinesArea = !!pathname?.startsWith('/pipelines');

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  };

  const goRoot = () => router.push('/pipelines');
  const goPipeline = (id: string) => router.push(`/pipelines/${id}`);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          aria-expanded={expanded}
          aria-controls={itemsId}
          className="!border-0 !px-0 flex h-7 w-5 items-center justify-center rounded !text-[var(--bq-t3)] hover:!bg-[var(--bq-raised)] hover:!text-[var(--bq-t1)]"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          onClick={goRoot}
          className={`!border-0 !justify-start !px-2 flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
            isPipelinesArea
              ? '!bg-[var(--bq-raised-2)] !text-[var(--bq-t1)]'
              : '!text-[var(--bq-t2)] hover:!bg-[var(--bq-raised)] hover:!text-[var(--bq-t1)]'
          }`}
        >
          <KanbanSquare className="size-5" />
          <span className="flex-1">Pipelines</span>
        </Button>
      </div>

      {expanded && (
        <div id={itemsId} className="ml-5 space-y-0.5 border-l border-[var(--bq-hair)] pl-2">
          <Button
            type="button"
            onClick={goRoot}
            aria-current={isPipelinesRoot ? 'page' : undefined}
            className={`!border-0 !justify-start !px-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              isPipelinesRoot
                ? '!bg-[var(--bq-raised-2)] font-medium !text-[var(--bq-t1)]'
                : '!text-[var(--bq-t2)] hover:!bg-[var(--bq-raised)] hover:!text-[var(--bq-t1)]'
            }`}
          >
            <KanbanSquare className="size-3.5 !text-[var(--bq-t3)]" />
            <span className="flex-1">Todos</span>
          </Button>

          {visible.map((p) => {
            const isActive = activePipelineId === p.id;
            const colorCls = COLOR_CLS[p.color ?? 'default'] ?? COLOR_CLS.default;
            const Icon = p.isDefault ? Star : Filter;
            return (
              <Button
                key={p.id}
                type="button"
                onClick={() => goPipeline(p.id)}
                title={p.name}
                aria-current={isActive ? 'page' : undefined}
                className={`!border-0 !justify-start !px-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                  isActive
                    ? '!bg-[var(--bq-raised-2)] font-medium !text-[var(--bq-t1)]'
                    : '!text-[var(--bq-t2)] hover:!bg-[var(--bq-raised)] hover:!text-[var(--bq-t1)]'
                }`}
              >
                <Icon className={`size-3.5 ${colorCls}`} />
                <span className="flex-1 truncate">{p.name}</span>
                {typeof p._count?.cards === 'number' && p._count.cards > 0 && (
                  <span className="text-[10px] !text-[var(--bq-t3)]">
                    {p._count.cards}
                  </span>
                )}
              </Button>
            );
          })}

          <Button
            type="button"
            onClick={goRoot}
            className="!border-0 !justify-start !px-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs !text-[var(--bq-t3)] hover:!bg-[var(--bq-raised)] hover:!text-[var(--bq-t1)]"
            title="Gerenciar pipelines"
          >
            <Plus className="size-3.5" />
            <span>Novo pipeline</span>
          </Button>
        </div>
      )}
    </div>
  );
}
