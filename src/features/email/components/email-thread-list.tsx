"use client";

import { useState } from "react";
import { Loader2, MailOpen, RefreshCw } from "lucide-react";
import type { EmailThreadSummary } from "@/features/email/services/email.service";
import { formatShortDate } from "@/features/email/lib/format";

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
  const [search, setSearch] = useState("");
  const filtered = threads.filter((thread) =>
    `${thread.subject} ${thread.from.email} ${thread.from.name || ""} ${thread.snippet}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="flex h-full w-full min-w-0 flex-col border-r border-[var(--bq-hair)] bg-transparent  ">
      <div className="px-2.5 pb-1.5 pt-2.5">
        <h2 className="sr-only">{folderName}</h2>
        <input
          aria-label="Buscar nos e-mails carregados"
          placeholder="Buscar e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-3 py-2 text-xs outline-offset-2"
        />
        {search && (
          <p className="mt-1 text-[10px] text-[var(--bq-t3)]">
            Busca nos e-mails carregados. Carregue mais para ampliar.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-[var(--bq-raised)] "
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-[var(--bq-t2)] ">
              Não foi possível carregar os e-mails desta pasta.
            </p>
            <p className="text-xs text-[var(--bq-t3)] ">
              Se o problema continuar, reconecte o canal Gmail em Configurações
              → Canais.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--bq-hair)] px-2.5 py-1.5 text-xs text-[var(--bq-t2)] hover:bg-transparent   "
            >
              <RefreshCw className="h-3 w-3" /> Tentar de novo
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MailOpen className="h-8 w-8 text-[var(--bq-t3)] " />
            <p className="text-sm text-[var(--bq-t3)] ">
              {search
                ? "Nenhum e-mail carregado corresponde à busca."
                : "Pasta vazia"}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((t) => {
              const isActive = activeThreadId === t.id;
              const fromLabel = t.from.name || t.from.email || "Desconhecido";
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-[var(--bq-hair)] px-3 py-2.5 text-left transition-colors  ${
                      isActive
                        ? "bg-[var(--bq-raised-2)]"
                        : "hover:bg-[var(--bq-surface)] "
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--bq-solid-bg)]" />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          t.unread
                            ? "font-semibold text-[var(--bq-t1)] "
                            : "text-[var(--bq-t2)] "
                        }`}
                      >
                        {fromLabel}
                      </span>
                      <span className="shrink-0 text-[11px] text-[var(--bq-t3)] ">
                        {formatShortDate(t.date)}
                      </span>
                    </div>
                    <span
                      className={`truncate text-[13px] ${
                        t.unread
                          ? "font-medium text-[var(--bq-t1)] "
                          : "text-[var(--bq-t2)] "
                      }`}
                    >
                      {t.subject}
                    </span>
                    <span className="truncate text-xs text-[var(--bq-t3)] ">
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
        <div className="border-t border-[var(--bq-hair)] p-2 ">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-60  "
          >
            {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}
