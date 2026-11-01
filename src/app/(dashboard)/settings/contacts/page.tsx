'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, MessageSquare, RefreshCw, X, AlertTriangle, Mail } from 'lucide-react';
import { contactsService, type SyncAvatarsResult } from '@/features/contacts/services/contacts.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useAuthStore } from '@/stores/auth-store';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
  GMAIL: Mail,
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
          description: `${result.total} contatos em ${seconds}s. ${rehosted > 0 ? `${rehosted} salvas no Synq (não expiram). ` : ''}${result.skipped > 0 ? `${result.skipped} sem foto. ` : ''}${result.failed > 0 ? `${result.failed} erros.` : ''}`,
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

  return <div className="space-y-5">
    <section className={styles.block} aria-label="Contatos">
      <div className="p-3.5 border-b border-[var(--bq-hair)]"><label className={styles.search}><Search size={14} /><input aria-label="Buscar contato" placeholder="Buscar por nome, telefone ou e-mail" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label></div>
      {isLoading ? <p role="status" className="p-4">Carregando contatos…</p> : contacts.length === 0 ? <p className="p-4 text-[var(--bq-t3)]">Nenhum contato encontrado</p> : contacts.map(contact => <div className={styles.listRow} key={contact.id}>
                        {contact.avatarUrl ? (
                          // S20 Wave 1: foto de perfil do WhatsApp quando
                          // disponivel. Fallback gracioso pra iniciais se
                          // a img falhar (URL Zappfy expirada, etc.).
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name || ''}
                            referrerPolicy="no-referrer"
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

        <div className={styles.rowText}><h3>{contact.name || 'Sem nome'}</h3><p>{[contact.phone,contact.email].filter(Boolean).join(' · ') || 'Telefone e e-mail não informados'} · {contact._count?.conversations || 0} conversas</p>
          <div className="mt-1 flex flex-wrap gap-1">{contact.channels.map(ch => { const Icon=channelIcons[ch.channel.type] || MessageSquare; return <span className="bq-pill" key={ch.id}><Icon className="size-3" />{ch.channel.name}</span>; })}</div>
        </div>
        <div className={styles.rowActions}>{contact.tags.map(t => <span className={styles.tagChip} key={t.tag.id}><i style={{backgroundColor:t.tag.color}} />{t.tag.name}</span>)}</div>
      </div>)}
      {pagination && <div className={styles.listRow}><span className={styles.unavailable}>{pagination.total} contatos · Página {pagination.page} de {pagination.totalPages}</span>{pagination.totalPages > 1 && <div className={styles.rowActions}><Button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page === 1}>Anterior</Button><Button onClick={() => setPage(p => Math.min(pagination.totalPages,p+1))} disabled={page === pagination.totalPages}>Próxima</Button></div>}</div>}
    </section>
    <section><h2 className={styles.sectionTitle}>Fotos e importação</h2><div className={styles.block}>
      {canSync && <SettingRow title="Buscar as fotos pelo WhatsApp" description="Atualiza e salva as fotos dos contatos no Synq."><Button onClick={() => setShowSyncConfirm(true)} disabled={syncMutation.isPending || backfillMutation.isPending}><RefreshCw size={13} />{syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar'}</Button></SettingRow>}
      <SettingRow title="Importar contatos" description="Planilha CSV com nome, telefone e e-mail. Ainda não disponível."><Button disabled>Importar</Button></SettingRow>
      {canSync && <SettingRow title="Reprocessar mensagens de bot" description="Recupera conteúdo do histórico que aparece como não suportado."><Button onClick={() => backfillMutation.mutate()} disabled={backfillMutation.isPending || syncMutation.isPending}>{backfillMutation.isPending ? 'Reprocessando…' : 'Reprocessar'}</Button></SettingRow>}
    </div></section>
    {showSyncConfirm && <SyncConfirmModal total={pagination?.total ?? 0} isPending={syncMutation.isPending} onConfirm={() => syncMutation.mutate()} onCancel={() => !syncMutation.isPending && setShowSyncConfirm(false)} />}
  </div>;
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
