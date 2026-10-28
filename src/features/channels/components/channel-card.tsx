'use client';

import styles from '@/features/settings/components/settings.module.css';
import { Button, Pill } from '@/components/ui/foundation';
import { useRef, useState } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Instagram,
  Sparkles,
  Pencil,
  Trash2,
  Zap,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Globe,
  Mail,
  Inbox,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '@/features/channels/services/channels.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { useChannelSync } from '@/features/channels/hooks/use-channel-sync';
import { EditChannelDialog } from '@/features/channels/components/edit-channel-dialog';

const channelTypeMap: Record<string, { label: string; icon: React.ElementType }> = {
  WHATSAPP_ZAPPFY: { label: 'WhatsApp (Zappfy)', icon: MessageCircle },
  WHATSAPP_OFFICIAL: { label: 'WhatsApp Official', icon: MessageCircle },
  INSTAGRAM: { label: 'Instagram', icon: Instagram },
  GMAIL: { label: 'Gmail', icon: Mail },
  JARVIS: { label: 'Jarvis (interno)', icon: Sparkles },
};

interface ChannelCardProps {
  channel: Channel;
  onUpdate: () => void;
}

export function ChannelCard({ channel, onUpdate }: ChannelCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [openingInbox, setOpeningInbox] = useState(false);

  const openInInbox = async () => {
    setOpeningInbox(true);
    try {
      await channelsService.ensureInboxView(channel.id);
      window.location.href = '/inbox';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível abrir na inbox');
      // still try inbox with channel filter via query if we can
      window.location.href = '/inbox';
    } finally {
      setOpeningInbox(false);
    }
  };
  const [expanded, setExpanded] = useState(false);
  const [draftName, setDraftName] = useState(channel.name);
  const [savingName, setSavingName] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const panelId = `channel-${channel.id}-editor`;
  const closeEditor = () => {
    setExpanded(false);
    setDraftName(channel.name);
    editButton.current?.focus();
  };
  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name || savingName) return;
    if (name === channel.name) { closeEditor(); return; }
    setSavingName(true);
    try {
      await channelsService.update(channel.id, { name });
      toast.success('Nome do canal atualizado');
      onUpdate();
      closeEditor();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar canal');
    } finally { setSavingName(false); }
  };
  const [editing, setEditing] = useState(false);
  const meta = channelTypeMap[channel.type] || { label: channel.type, icon: MessageSquare };
  const Icon = meta.icon;
  const sync = useChannelSync({ channelId: channel.id, channelType: channel.type });

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await channelsService.testConnection(channel.id);
      if (result.success) {
        toast.success(`Conexão OK: ${typeof result.status === 'string' ? result.status : JSON.stringify(result.status)}`);
      } else {
        toast.error(`Falha: ${result.error}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      await channelsService.update(channel.id, { isActive: !channel.isActive });
      toast.success(channel.isActive ? 'Canal desativado' : 'Canal ativado');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar canal');
    }
  };

  const handleToggleVisibility = async () => {
    const goingPrivate = channel.visibility !== 'PRIVATE';
    if (goingPrivate) {
      const ok = window.confirm(
        'Tornar este canal privado?\n\n' +
          'Apenas você e quem você der permissão explícita verão esse canal — ' +
          'OWNERs e ADMINs da org NÃO terão acesso automático.\n\n' +
          'Você pode liberar acesso pra outros membros depois pelas configurações de membros.',
      );
      if (!ok) return;
    }
    try {
      await channelsService.update(channel.id, {
        visibility: goingPrivate ? 'PRIVATE' : 'ORG',
      });
      toast.success(goingPrivate ? 'Canal agora é privado' : 'Canal agora é público na org');
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao alterar visibilidade',
      );
    }
  };

  const handleDelete = async () => {
    const typed = prompt(
      `Para remover o canal, digite o nome exato:\n\n"${channel.name}"\n\nMensagens e conversas são preservadas no histórico, mas o canal ficará inativo.`,
    );
    if (typed == null) return;
    if (typed.trim() !== channel.name) {
      toast.error('Nome não confere — cancelado.');
      return;
    }
    try {
      await channelsService.remove(channel.id, typed.trim());
      toast.success('Canal removido');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover canal');
    }
  };

  const handleSync = async () => {
    try {
      await sync.startSync();
      toast.success('Sincronização iniciada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar sincronização');
    }
  };

  const handleCancelSync = async () => {
    try {
      await sync.cancelSync();
      toast.success('Sincronização cancelada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar sincronização');
    }
  };

  const isSyncRunning = sync.job?.status === 'RUNNING' || sync.job?.status === 'PENDING';
  const isSyncCompleted = sync.job?.status === 'COMPLETED';
  const isSyncFailed = sync.job?.status === 'FAILED';
  const progressPct =
    sync.job && sync.job.conversationsTotal > 0
      ? Math.min(100, Math.round((sync.job.conversationsImported / sync.job.conversationsTotal) * 100))
      : 0;

  return (
    <div className={styles.channelRow}>
      <div className={styles.channelSummary}>
        <span className={styles.channelIcon}><Icon aria-hidden /></span>
        <div className={styles.channelText}>
          <h3>{channel.name}</h3>
          <p>{meta.label} · quem vê: {channel.visibility === 'PRIVATE' ? 'Membros com permissão' : 'Toda a equipe'}</p>
        </div>
        <div className={styles.rowActions}>
          <span className={styles.channelStatus} data-active={channel.isActive}><Pill>{channel.isActive ? 'Ativo' : 'Inativo'}</Pill></span>
          <Button aria-expanded={expanded} aria-controls={panelId} onClick={event => {
            editButton.current = event.currentTarget;
            if (expanded) closeEditor();
            else { setDraftName(channel.name); setExpanded(true); }
          }}>Editar</Button>
        </div>
      </div>
      {expanded && <div id={panelId} className={styles.channelEditor} role="region" aria-label={`Editar ${channel.name}`}>
        <form onSubmit={saveName} className={styles.channelNameForm}>
          <label htmlFor={`${panelId}-name`}>Nome</label>
          <input id={`${panelId}-name`} autoFocus value={draftName} disabled={savingName} onChange={event => setDraftName(event.target.value)} />
          <Button type="submit" disabled={savingName || !draftName.trim()}>{savingName ? 'Salvando…' : 'Salvar'}</Button>
          <Button disabled={savingName} onClick={closeEditor}>Cancelar</Button>
        </form>
        {channel.type === 'GMAIL' && (() => {
          if (!channel.googlePermissions) return null;
          const { hasRead, hasSend, hasCalendar: hasCal } = channel.googlePermissions;
          const badge = (ok: boolean, okCls: string) =>
            ok
              ? okCls
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
          return (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span
                className={`rounded-full px-1.5 py-0.5 text-bq-text-phase-number font-medium ${
                  badge(
                    hasRead,
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                  )
                }`}
                title="Leitura Gmail"
              >
                Leitura {hasRead ? '✓' : '—'}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-bq-text-phase-number font-medium ${
                  badge(
                    hasSend,
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                  )
                }`}
                title="Envio / reply Gmail"
              >
                Envio {hasSend ? '✓' : '—'}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-bq-text-phase-number font-medium ${
                  badge(
                    hasCal,
                    'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
                  )
                }`}
                title="Google Agenda"
              >
                Agenda {hasCal ? '✓' : 'pendente'}
              </span>
            </div>
          );
        })()}

        {sync.supported && sync.job && (
          <div className="mt-3">
            {isSyncRunning && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sincronizando
                    {sync.job.conversationsTotal > 0 && (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {sync.job.conversationsImported}/{sync.job.conversationsTotal} conversas · {sync.job.messagesImported} msgs
                      </span>
                    )}
                  </span>
                  <Button
                    onClick={handleCancelSync}
                  >
                    Cancelar
                  </Button>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-pink-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
            {isSyncCompleted && (
              <p className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {sync.job.conversationsImported} conversas, {sync.job.messagesImported} mensagens sincronizadas
              </p>
            )}
            {isSyncFailed && (
              <p className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                Sync falhou: {sync.job.errorMessage || 'erro desconhecido'}
              </p>
            )}
            {sync.job.status === 'CANCELLED' && (
              <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <XCircle className="h-3 w-3" />
                Sincronização cancelada
              </p>
            )}
          </div>
        )}

        <div className={styles.channelActions} aria-label="Conexão e sincronização">
          <Button
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Testar Conexão
          </Button>
          {sync.supported && (
            <Button
              onClick={handleSync}
              disabled={isSyncRunning || sync.loading}
            >
              {sync.loading || isSyncRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Sincronizar
            </Button>
          )}
          {channel.type === 'GMAIL' && (
            <>
              <Button
                onClick={openInInbox}
                disabled={openingInbox}
              >
                {openingInbox ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Inbox className="h-3 w-3" />
                )}
                Ver e-mails na inbox
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { url } = await channelsService.gmailOAuthStart({
                      name: channel.name,
                      channelId: channel.id,
                      returnTo: '/settings/channels',
                    });
                    window.location.href = url;
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : 'Falha ao reconectar Google',
                    );
                  }
                }}
              >
                Reconectar Google
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { url } = await channelsService.gmailOAuthStart({
                      name: channel.name,
                      channelId: channel.id,
                      returnTo: '/calendar',
                    });
                    window.location.href = url;
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : 'Falha ao autorizar Agenda',
                    );
                  }
                }}
                title="Autoriza calendar.events no mesmo Google do e-mail"
              >
                <CalendarDays className="h-3 w-3" />
                {!channel.googlePermissions
                  ? 'Gerenciar acesso à Agenda'
                  : channel.googlePermissions.hasCalendar
                    ? 'Reautorizar Agenda'
                    : 'Autorizar Agenda'}
              </Button>
            </>
          )}
          <Button
            onClick={handleToggle}
          >
            {channel.isActive ? (
              <PowerOff className="h-3 w-3" />
            ) : (
              <Power className="h-3 w-3" />
            )}
            {channel.isActive ? 'Desativar' : 'Ativar'}
          </Button>
          <Button onClick={() => setEditing(true)}><Pencil aria-hidden />Editar credenciais</Button>
          <Button onClick={handleToggleVisibility}>
            {channel.visibility === 'PRIVATE' ? <><Globe aria-hidden />Tornar público na org</> : <><Lock aria-hidden />Tornar privado</>}
          </Button>
          <Button onClick={handleDelete}><Trash2 aria-hidden />Remover</Button>
          <a href="/inbox" className="bq-button">Abrir inbox</a>
        </div>
      </div>}
      <EditChannelDialog
        channel={editing ? channel : null}
        onClose={() => setEditing(false)}
        onSaved={onUpdate}
      />
    </div>
  );
}
