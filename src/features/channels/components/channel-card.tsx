'use client';

import { Button } from '@/components/ui/foundation';
import { useState } from 'react';
import {
  MessageSquare,
  MoreVertical,
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
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { EditChannelDialog } from '@/features/channels/components/edit-channel-dialog';

const channelTypeMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  WHATSAPP_ZAPPFY: { label: 'WhatsApp (Zappfy)', icon: ZappfyIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  WHATSAPP_OFFICIAL: { label: 'WhatsApp Official', icon: MetaIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  INSTAGRAM: { label: 'Instagram', icon: InstagramIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  GMAIL: { label: 'Gmail', icon: Mail, color: 'bg-red-50 dark:bg-red-950/30' },
  JARVIS: { label: 'Jarvis (interno)', icon: Mail, color: 'bg-violet-50 dark:bg-violet-950/30' },
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
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const meta = channelTypeMap[channel.type] || { label: channel.type, icon: MessageSquare, color: 'bg-gray-500' };
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
    <div className="relative grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 ${meta.color}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {channel.name}
          </h3>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              channel.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {channel.isActive ? 'Ativo' : 'Inativo'}
          </span>
          {channel.visibility === 'PRIVATE' && (
            <span
              title="Canal privado — só membros com permissão explícita enxergam, mesmo OWNER/ADMIN"
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <Lock className="h-3 w-3" />
              Privado
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{meta.label}</p>
        {channel.type === 'GMAIL' && (() => {
          const { hasRead = false, hasSend = false, hasCalendar: hasCal = false } = channel.googlePermissions ?? {};
          const badge = (ok: boolean, okCls: string) =>
            ok
              ? okCls
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
          return (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
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
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
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
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                {channel.googlePermissions?.hasCalendar
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
        </div>
      </div>
      <div className="relative">
        <Button
          aria-label={`Ações do canal ${channel.name}`}
          aria-expanded={showMenu}
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="bq-popover absolute right-0 top-full z-20 mt-1 flex flex-col items-stretch gap-1">
              <Button
                onClick={() => { setEditing(true); setShowMenu(false); }}
              >
                <Pencil className="h-3 w-3" />
                Editar credenciais
              </Button>
              <Button
                onClick={() => { handleToggleVisibility(); setShowMenu(false); }}
              >
                {channel.visibility === 'PRIVATE' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Tornar público na org
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Tornar privado
                  </>
                )}
              </Button>
              <Button
                onClick={() => { handleDelete(); setShowMenu(false); }}
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </Button>
            </div>
          </>
        )}
      </div>
      <EditChannelDialog
        channel={editing ? channel : null}
        onClose={() => setEditing(false)}
        onSaved={onUpdate}
      />
    </div>
  );
}
