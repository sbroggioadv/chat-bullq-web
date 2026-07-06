'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Radio, ShieldCheck } from 'lucide-react';
import { channelsService } from '../services/channels.service';
import { ChannelCard } from './channel-card';
import { CreateChannelDialog } from './create-channel-dialog';
import { useOrgId } from '@/hooks/use-org-query-key';

export function ChannelsList() {
  const [showCreate, setShowCreate] = useState(false);
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const isInviteOnboarding =
    searchParams.get('onboarding') === 'channels' && searchParams.get('source') === 'invite';

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['channels'] });
  const hasNoChannels = !isLoading && (!channels || channels.length === 0);

  useEffect(() => {
    if (!isInviteOnboarding || !hasNoChannels || didAutoOpen.current) return;
    didAutoOpen.current = true;
    setShowCreate(true);
  }, [hasNoChannels, isInviteOnboarding]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Meus canais</h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Conecte WhatsApp, Instagram e demais caixas de entrada
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Conectar canal
        </button>
      </div>

      {isInviteOnboarding && (
        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-800 dark:border-primary/30 dark:bg-primary/10 dark:text-zinc-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Próximo passo: conectar seu WhatsApp</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  O canal fica privado por padrão e só você terá acesso até liberar outros membros.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Conectar WhatsApp
            </button>
          </div>
        </div>
      )}

      {!isInviteOnboarding && hasNoChannels && (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Conecte seu WhatsApp</p>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
                O primeiro canal fica privado por padrão. Só quem receber permissão explícita
                consegue ver ou responder mensagens desse número.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          ))
        ) : channels && channels.length > 0 ? (
          channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} onUpdate={refresh} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
            <Radio className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhum canal configurado
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Conecte seu WhatsApp para começar a receber mensagens
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Conectar WhatsApp
            </button>
          </div>
        )}
      </div>

      <CreateChannelDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
    </div>
  );
}
