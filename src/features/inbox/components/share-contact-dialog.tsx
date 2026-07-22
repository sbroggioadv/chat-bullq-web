'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Send, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onShare: (contacts: Contact[]) => Promise<void>;
}

function displayLabel(c: Contact): string {
  return c.name?.trim() || c.phone?.trim() || c.email?.trim() || 'Sem nome';
}

export function ShareContactDialog({ open, onClose, onShare }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', 'share-picker', query],
    queryFn: () =>
      contactsService.list({
        limit: '100',
        page: '1',
        ...(query.trim() ? { search: query.trim() } : {}),
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const contacts = data?.contacts ?? [];

  const filtered = useMemo(() => {
    // Backend already filters by search; keep client filter as safety net.
    const q = query.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const blob = `${c.name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [contacts, query]);

  const selected = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds],
  );

  const toggle = (c: Contact) => {
    if (!c.phone?.trim()) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      await onShare(selected);
      toast.success(
        selected.length === 1
          ? 'Contato compartilhado'
          : `${selected.length} contatos compartilhados`,
      );
      setSelectedIds(new Set());
      setQuery('');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao compartilhar contato');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">Compartilhar contato</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 dark:border-zinc-700 dark:bg-zinc-800">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou telefone…"
              className="h-9 w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contatos…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-zinc-500">
              Nenhum contato encontrado
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => {
                const hasPhone = !!c.phone?.trim();
                const checked = selectedIds.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!hasPhone}
                      onClick={() => toggle(c)}
                      title={
                        hasPhone
                          ? `Compartilhar ${c.phone}`
                          : 'Contato sem número cadastrado'
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        !hasPhone
                          ? 'cursor-not-allowed opacity-40'
                          : checked
                            ? 'bg-primary/10'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <UserRound className="h-4 w-4 text-zinc-400" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {displayLabel(c)}
                        </span>
                        <span className="block truncate text-xs text-zinc-500 tabular-nums">
                          {c.phone || 'Sem número'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <span className="text-xs text-zinc-500">
            {selectedIds.size === 0
              ? 'Selecione um ou mais contatos com telefone'
              : `${selectedIds.size} selecionado${selectedIds.size === 1 ? '' : 's'}`}
          </span>
          <button
            type="button"
            disabled={selectedIds.size === 0 || sending}
            onClick={() => void handleSend()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
