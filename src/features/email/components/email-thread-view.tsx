'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Forward,
  Loader2,
  MailOpen,
  RefreshCw,
  Reply,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EmailThreadDetail } from '../services/email.service';
import { emailService } from '../services/email.service';
import { formatLongDate } from '../lib/format';

type ComposeMode = 'reply' | 'forward' | null;

interface EmailThreadViewProps {
  detail: EmailThreadDetail | undefined;
  channelId: string | undefined;
  threadSelected: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
  onSent: () => void;
  onReauth?: () => void;
}

export function EmailThreadView({
  detail,
  channelId,
  threadSelected,
  loading,
  error,
  onRetry,
  onBack,
  onSent,
  onReauth,
}: EmailThreadViewProps) {
  const [mode, setMode] = useState<ComposeMode>(null);
  const [body, setBody] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [sending, setSending] = useState(false);
  const [reauthHint, setReauthHint] = useState(false);

  const defaultTo = useMemo(() => {
    if (!detail?.messages?.length) return '';
    const inbound = [...detail.messages].reverse().find((m) => !m.outbound);
    return inbound?.from.email || '';
  }, [detail]);

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

  const openCompose = (m: ComposeMode) => {
    setMode(m);
    setBody('');
    setForwardTo('');
    setReauthHint(false);
  };

  const handleSend = async () => {
    if (!channelId || !detail.id || !mode) return;
    if (mode === 'reply' && !body.trim()) {
      toast.error('Escreva a resposta antes de enviar');
      return;
    }
    if (mode === 'forward' && !forwardTo.trim()) {
      toast.error('Informe o destinatário para encaminhar');
      return;
    }
    setSending(true);
    try {
      if (mode === 'reply') {
        await emailService.reply({
          channelId,
          threadId: detail.id,
          body: body.trim(),
          to: defaultTo || undefined,
        });
        toast.success('Resposta enviada');
      } else {
        await emailService.forward({
          channelId,
          threadId: detail.id,
          to: forwardTo.trim(),
          body: body.trim() || undefined,
        });
        toast.success('E-mail encaminhado');
      }
      setBody('');
      setForwardTo('');
      setMode(null);
      setReauthHint(false);
      onSent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar';
      if (/leitura|reconect|gmail\.send|gmail\.modify|permiss|scope|403|autoriz/i.test(msg)) {
        setReauthHint(true);
      }
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

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
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {detail.subject}
        </h1>
        <button
          type="button"
          onClick={() => openCompose(mode === 'reply' ? null : 'reply')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Reply className="h-3.5 w-3.5" />
          Responder
        </button>
        <button
          type="button"
          onClick={() => openCompose(mode === 'forward' ? null : 'forward')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Forward className="h-3.5 w-3.5" />
          Encaminhar
        </button>
      </div>

      {reauthHint && (
        <div className="border-b border-amber-200/80 bg-amber-50 px-5 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          O Google ainda não autorizou envio nesta conexão.{' '}
          <button
            type="button"
            onClick={onReauth}
            className="font-semibold underline underline-offset-2"
          >
            Reconectar Google uma vez
          </button>{' '}
          (no canal existente — não cria caixa nova) e marque o acesso ao Gmail.
        </div>
      )}

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

      {mode && (
        <div className="border-t border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {mode === 'reply'
                ? `Responder${defaultTo ? ` para ${defaultTo}` : ''}`
                : 'Encaminhar e-mail'}
            </p>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Cancelar
            </button>
          </div>

          {mode === 'forward' && (
            <input
              type="text"
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
              placeholder="Para: email@cliente.com (vírgula para vários)"
              className="mb-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          )}

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={mode === 'forward' ? 3 : 5}
            placeholder={
              mode === 'reply'
                ? 'Escreva sua resposta…'
                : 'Nota opcional acima da mensagem encaminhada…'
            }
            className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-primary/30 placeholder:text-zinc-400 focus:border-primary focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={
                sending ||
                (mode === 'reply' ? !body.trim() : !forwardTo.trim())
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {mode === 'reply' ? 'Enviar resposta' : 'Encaminhar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
