'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Users, MessageSquare, ExternalLink, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { contactsService, type Contact, type SyncAvatarsResult } from '@/features/contacts/services/contacts.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useAuthStore } from '@/stores/auth-store';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const activeOrg = useAuthStore((s) =>
    s.organizations.find((o) => o.id === s.activeOrgId),
  );
  const canSync = activeOrg?.role === 'OWNER' || activeOrg?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', orgId, search, page],
    queryFn: () => contactsService.list({ search, page: String(page), limit: '20' }),
  });

  const contacts = data?.contacts || [];
  const pagination = data?.pagination;

  // S20 Wave 1: backfill de fotos do WhatsApp. Operacao cara — modal de
  // confirmacao antes pra evitar disparo acidental.
  const syncMutation = useMutation<SyncAvatarsResult>({
    mutationFn: () => contactsService.syncAvatars(),
    onSuccess: (result) => {
      const seconds = Math.round(result.durationMs / 1000);
      const rehosted = (result as SyncAvatarsResult & { rehosted?: number }).rehosted ?? 0;
      toast.success(
        `${result.enriched} foto${result.enriched === 1 ? '' : 's'} atualizada${result.enriched === 1 ? '' : 's'}`,
        {
          description: `${result.total} contatos em ${seconds}s. ${rehosted > 0 ? `${rehosted} salvas no BullQ (não expiram). ` : ''}${result.skipped > 0 ? `${result.skipped} sem foto. ` : ''}${result.failed > 0 ? `${result.failed} erros.` : ''}`,
        },
      );
      // Invalida cache de contatos pra re-renderizar com fotos novas
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowSyncConfirm(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      toast.error('Falha na sincronizacao', { description: msg });
    },
  });

  // Reprocess [Unsupported message type] history via rawPayload mappers.
  const backfillMutation = useMutation({
    mutationFn: () => channelsService.backfillContentAll(),
    onSuccess: (result) => {
      toast.success(
        `${result.updated} mensagem${result.updated === 1 ? '' : 'ns'} reprocessada${result.updated === 1 ? '' : 's'}`,
        {
          description: `${result.scanned} lidas em ${result.channels} canal(is). ${result.unchanged} sem mudança (sem rawPayload ou já ok). ${result.errors} erros.`,
        },
      );
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro no reprocessamento';
      toast.error('Falha ao reprocessar histórico', { description: msg });
    },
  });

  return (
    <div className="flex h-full flex-col min-h-0 min-w-0 p-6">
      <div className="mx-auto w-full max-w-5xl shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Contatos</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {pagination ? `${pagination.total} contatos` : 'Carregando...'}
            </p>
          </div>
          {canSync && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => backfillMutation.mutate()}
                disabled={backfillMutation.isPending || syncMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
                title="Reescreve mensagens antigas de bot/automação que aparecem como 'Unsupported' ou 'reprocessar histórico'"
              >
                <RefreshCw
                  className={`h-4 w-4 ${backfillMutation.isPending ? 'animate-spin' : ''}`}
                />
                {backfillMutation.isPending
                  ? 'Reprocessando…'
                  : 'Reprocessar mensagens de bot'}
              </button>
              <button
                type="button"
                onClick={() => setShowSyncConfirm(true)}
                disabled={syncMutation.isPending || backfillMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                title="Buscar fotos de perfil dos contatos via WhatsApp e salvar no BullQ"
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar fotos do WhatsApp'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-5xl min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header fixo da tabela */}
        <table className="w-full table-fixed shrink-0">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="w-[30%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Contato</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Telefone</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Canais</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Tags</th>
              <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Conversas</th>
            </tr>
          </thead>
        </table>

        {/* Corpo scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
            </colgroup>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800">
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                    <p className="mt-3 text-sm text-zinc-500">Nenhum contato encontrado</p>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {contact.avatarUrl ? (
                          // S20 Wave 1: foto de perfil do WhatsApp quando
                          // disponivel. Fallback gracioso pra iniciais se
                          // a img falhar (URL Zappfy expirada, etc.).
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name || ''}
                            className="size-8 shrink-0 rounded-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                              const next = e.currentTarget.nextElementSibling;
                              if (next) (next as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          style={{ display: contact.avatarUrl ? 'none' : 'flex' }}
                        >
                          {(contact.name || '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {contact.name || 'Sem nome'}
                          </p>
                          {contact.email && (
                            <p className="truncate text-[11px] text-zinc-400">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {contact.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.channels.map((ch) => {
                          const Icon = channelIcons[ch.channel.type] || MessageSquare;
                          return (
                            <span key={ch.id} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
                              <Icon className="h-3 w-3" />
                              <span className="truncate max-w-20">{ch.channel.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((t) => (
                          <span
                            key={t.tag.id}
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white truncate max-w-20"
                            style={{ backgroundColor: t.tag.color }}
                          >
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
                      {contact._count?.conversations || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* S20 Wave 1: modal de confirmacao do backfill de fotos. Operacao
            cara em chamadas Zappfy — confirma antes de disparar. */}
        {showSyncConfirm && (
          <SyncConfirmModal
            total={pagination?.total ?? 0}
            isPending={syncMutation.isPending}
            onConfirm={() => syncMutation.mutate()}
            onCancel={() => !syncMutation.isPending && setShowSyncConfirm(false)}
          />
        )}

        {/* Paginação fixa no rodapé */}
        {pagination && pagination.totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * S20 Wave 1: modal de confirmacao antes do backfill de fotos do WhatsApp.
 * Operacao cara (chamadas Zappfy serializadas com concorrencia 5) — modal
 * forca o user a confirmar e mostra estimativa de tempo + contagem de
 * contatos afetados.
 */
function SyncConfirmModal({
  total,
  isPending,
  onConfirm,
  onCancel,
}: {
  total: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, isPending]);

  // Estimativa: ~300ms por contato em concorrencia 5 = 60ms efetivo por unidade
  const estimatedSeconds = Math.max(5, Math.ceil((total * 60) / 1000));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !isPending && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </span>
            <h3 id="sync-confirm-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Sincronizar fotos do WhatsApp
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Cancelar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Isso vai buscar a foto de perfil de <strong className="text-zinc-900 dark:text-zinc-100">{total} contatos</strong> via WhatsApp (Zappfy).
          </p>
          <p>
            Tempo estimado: <strong className="text-zinc-900 dark:text-zinc-100">~{estimatedSeconds}s</strong>. A pagina pode ficar lenta durante a sincronizacao.
          </p>
          <p className="text-xs text-zinc-500">
            URLs do WhatsApp expiram em ~14 dias. A Sprint S20 Wave 2 vai adicionar sincronizacao automatica diaria para manter as fotos sempre frescas.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || total === 0}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sincronizando…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Sincronizar agora
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
