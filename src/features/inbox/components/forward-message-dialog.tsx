'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { inboxService } from '../services/inbox.service';
import { useForwardMessage, type ForwardResult } from '../hooks/use-forward-message';

interface ConversationLike {
  id: string;
  name?: string | null;
  isGroup: boolean;
  contact?: { name?: string | null; phone?: string | null } | null;
  channel?: { name?: string | null } | null;
  externalChatId?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sourceMessageId: string;
  sourceConversationId: string;
  sourcePreview?: string;
}

// Cadeia de fallback: name → contact.name → contact.phone → externalChatId limpo → fallback fixo.
function displayName(c: ConversationLike): string {
  return (
    c.name?.trim() ||
    c.contact?.name?.trim() ||
    c.contact?.phone?.trim() ||
    c.externalChatId?.replace(/@g\.us$|@s\.whatsapp\.net$/, '').trim() ||
    'Conversa sem nome'
  );
}

const REASON_LABEL: Record<string, string> = {
  NOT_FOUND: 'Conversa não encontrada',
  CROSS_ORG: 'Conversa de outra organização',
  CHANNEL_FORBIDDEN: 'Sem acesso a esse canal',
};

export function ForwardMessageDialog({
  open,
  onClose,
  sourceMessageId,
  sourceConversationId,
  sourcePreview,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ForwardResult | null>(null);

  const forwardMut = useForwardMessage();

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ['conversations', 'all-for-forward'],
    queryFn: async () => {
      const res = await inboxService.getConversations({ limit: '500' });
      return res.conversations as ConversationLike[];
    },
    enabled: open,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const candidates = convs.filter((c) => c.id !== sourceConversationId);
    if (!q) return candidates;
    return candidates.filter((c) => displayName(c).toLowerCase().includes(q));
  }, [convs, query, sourceConversationId]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    try {
      const r = await forwardMut.mutateAsync({
        messageId: sourceMessageId,
        destinationConversationIds: Array.from(selectedIds),
      });
      setResult(r);
      if (r.rejected.length === 0) {
        toast.success(`Encaminhada para ${r.queued.length} conversa${r.queued.length === 1 ? '' : 's'}`);
      } else if (r.queued.length === 0) {
        toast.error('Nenhum destino aceito');
      } else {
        toast.warning(`Parcial: ${r.queued.length} OK, ${r.rejected.length} rejeitada(s)`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao encaminhar');
    }
  };

  const handleClose = () => {
    setQuery('');
    setSelectedIds(new Set());
    setResult(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Encaminhar mensagem
            </h3>
            {sourcePreview && (
              <p className="mt-1 truncate text-xs text-zinc-500" title={sourcePreview}>
                {sourcePreview}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-3 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {result ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-zinc-700 dark:text-zinc-200">
                {result.queued.length} enviada{result.queued.length === 1 ? '' : 's'}
              </span>
            </div>
            {result.rejected.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="mb-2 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  {result.rejected.length} rejeitada{result.rejected.length === 1 ? '' : 's'}
                </div>
                <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-200">
                  {result.rejected.map((r) => (
                    <li key={r.conversationId}>
                      <code className="font-mono">{r.conversationId.slice(0, 8)}…</code>{' '}
                      — {REASON_LABEL[r.reason] || r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar conversa…"
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selecionada${selectedIds.size === 1 ? '' : 's'} (máx 20)`
                  : 'Selecione até 20 destinos'}
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((c) => {
                    const checked = selectedIds.has(c.id);
                    const disabled = !checked && selectedIds.size >= 20;
                    return (
                      <li key={c.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                            disabled
                              ? 'cursor-not-allowed opacity-40'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleId(c.id)}
                            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                          />
                          <span className="flex-1 truncate text-zinc-700 dark:text-zinc-200">
                            {displayName(c)}
                          </span>
                          {c.isGroup && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800">
                              grupo
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <button
            onClick={handleClose}
            className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleSend}
              disabled={selectedIds.size === 0 || forwardMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {forwardMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Encaminhar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
