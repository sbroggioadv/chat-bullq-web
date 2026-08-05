'use client';

import { ArrowLeft, MailOpen, RefreshCw } from 'lucide-react';
import type { EmailThreadDetail } from '../services/email.service';
import { formatLongDate } from '../lib/format';

interface EmailThreadViewProps {
  detail: EmailThreadDetail | undefined;
  threadSelected: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Mobile: volta pra lista (colunas empilham em < md). */
  onBack: () => void;
}

/** Coluna 3 do /email — leitura do thread (readonly, corpo em texto). */
export function EmailThreadView({
  detail,
  threadSelected,
  loading,
  error,
  onRetry,
  onBack,
}: EmailThreadViewProps) {
  if (!threadSelected) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
        <MailOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Selecione um e-mail para ler
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full w-full space-y-3 bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="h-6 w-2/3 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Não foi possível carregar este e-mail.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <RefreshCw className="h-3 w-3" /> Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para a lista"
          className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {detail.subject}
        </h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {detail.messages.map((m) => {
          const fromLabel = m.from.name || m.from.email || 'Desconhecido';
          return (
            <article
              key={m.id}
              className={`rounded-lg border bg-white p-4 dark:bg-zinc-900 ${
                m.outbound
                  ? 'border-primary/30'
                  : 'border-zinc-200/80 dark:border-zinc-800'
              }`}
            >
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {fromLabel}
                </span>
                {m.from.name && m.from.email && (
                  <span className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                    &lt;{m.from.email}&gt;
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {formatLongDate(m.date)}
                </span>
              </header>
              {m.to && (
                <p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                  para {m.to}
                </p>
              )}
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {m.body || m.snippet || '(mensagem sem conteúdo)'}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
