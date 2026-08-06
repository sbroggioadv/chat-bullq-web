'use client';

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
  ExternalLink,
  Inbox,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../services/channels.service';
import { channelsService } from '../services/channels.service';
import { useChannelSync } from '../hooks/use-channel-sync';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { EditChannelDialog } from './edit-channel-dialog';

const channelTypeMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  WHATSAPP_ZAPPFY: { label: 'WhatsApp (Zappfy)', icon: ZappfyIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  WHATSAPP_OFFICIAL: { label: 'WhatsApp Official', icon: MetaIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  INSTAGRAM: { label: 'Instagram', icon: InstagramIcon, color: 'bg-zinc-50 dark:bg-zinc-800' },
  GMAIL: { label: 'Gmail', icon: Mail, color: 'bg-red-50 dark:bg-red-950/30' },
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
    <div className="relative flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 ${meta.color}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
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
          const cfg = (channel.config as any) || {};
          const granted = String(cfg.scopeGranted || cfg.scope || '');
          const hasRead =
            /gmail\.(readonly|modify|send)|mail\.google\.com/i.test(granted) ||
            !!cfg.refreshToken;
          const hasSend =
            cfg.hasGmailModify === true ||
            /gmail\.(modify|send)/i.test(granted);
          const hasCal =
            cfg.hasCalendar === true ||
            /calendar(\.events|\.readonly)?/i.test(granted);
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
                  <button
                    onClick={handleCancelSync}
                    className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  >
                    Cancelar
                  </button>
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
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {isTesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Testar Conexão
          </button>
          {sync.supported && (
            <button
              onClick={handleSync}
              disabled={isSyncRunning || sync.loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {sync.loading || isSyncRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Sincronizar
            </button>
          )}
          {channel.type === 'GMAIL' && (
            <>
              <button
                onClick={openInInbox}
                disabled={openingInbox}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                {openingInbox ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Inbox className="h-3 w-3" />
                )}
                Ver e-mails na inbox
              </button>
              <button
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
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Reconectar Google
              </button>
              <button
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
                className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 transition-colors hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60"
                title="Autoriza calendar.events no mesmo Google do e-mail"
              >
                <CalendarDays className="h-3 w-3" />
                {/calendar(\.events)?/i.test(
                  String(
                    (channel.config as any)?.scopeGranted ||
                      (channel.config as any)?.scope ||
                      '',
                  ),
                ) || (channel.config as any)?.hasCalendar
                  ? 'Reautorizar Agenda'
                  : 'Autorizar Agenda'}
              </button>
            </>
          )}
          <button
            onClick={handleToggle}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {channel.isActive ? (
              <PowerOff className="h-3 w-3" />
            ) : (
              <Power className="h-3 w-3" />
            )}
            {channel.isActive ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              <button
                onClick={() => { setEditing(true); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Pencil className="h-4 w-4" />
                Editar credenciais
              </button>
              <button
                onClick={() => { handleToggleVisibility(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {channel.visibility === 'PRIVATE' ? (
                  <>
                    <Globe className="h-4 w-4" />
                    Tornar público na org
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Tornar privado
                  </>
                )}
              </button>
              <button
                onClick={() => { handleDelete(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
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
