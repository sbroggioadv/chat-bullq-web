'use client';

import { Loader2, MailOpen, RefreshCw } from 'lucide-react';
import type { EmailThreadSummary } from '../services/email.service';
import { formatShortDate } from '../lib/format';

interface EmailThreadListProps {
  folderName: string;
  threads: EmailThreadSummary[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Coluna 2 do /email — lista de threads da pasta ativa. */
export function EmailThreadList({
  folderName,
  threads,
  activeThreadId,
  onSelect,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
}: EmailThreadListProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200/80 px-3 py-3 dark:border-zinc-800">
        <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {folderName}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Não foi possível carregar os e-mails desta pasta.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Se o problema continuar, reconecte o canal Gmail em Configurações
              → Canais.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <RefreshCw className="h-3 w-3" /> Tentar de novo
            </button>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MailOpen className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pasta vazia
            </p>
          </div>
        ) : (
          <ul>
            {threads.map((t) => {
              const isActive = activeThreadId === t.id;
              const fromLabel = t.from.name || t.from.email || 'Desconhecido';
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-zinc-100 px-3 py-2.5 text-left transition-colors dark:border-zinc-900 ${
                      isActive
                        ? 'bg-primary/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          t.unread
                            ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {fromLabel}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatShortDate(t.date)}
                      </span>
                    </div>
                    <span
                      className={`truncate text-[13px] ${
                        t.unread
                          ? 'font-medium text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {t.subject}
                    </span>
                    <span className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                      {t.snippet}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasMore && !loading && !error && (
        <div className="border-t border-zinc-200/80 p-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}
