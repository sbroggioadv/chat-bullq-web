'use client';

import { Button } from '@/components/ui/foundation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Radio, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { channelsService } from '@/features/channels/services/channels.service';
import { ChannelCard } from '@/features/channels/components/channel-card';
import { CreateChannelDialog } from '@/features/channels/components/create-channel-dialog';
import { useOrgId } from '@/hooks/use-org-query-key';

export function ChannelsList() {
  const [showCreate, setShowCreate] = useState(false);
  const searchParams = useSearchParams();
  const [didAutoOpen, setDidAutoOpen] = useState(false);
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const isInviteOnboarding =
    searchParams.get('onboarding') === 'channels' && searchParams.get('source') === 'invite';

  const { data: channels, isLoading, isError } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['channels'] });
  const hasNoChannels = !isLoading && !isError && (!channels || channels.length === 0);

  if (isInviteOnboarding && hasNoChannels && !didAutoOpen) {
    setDidAutoOpen(true);
    setShowCreate(true);
  }

  // Retorno do OAuth Gmail (?gmail=connected|error)
  useEffect(() => {
    const gmail = searchParams.get('gmail');
    if (!gmail) return;
    const email = searchParams.get('email') || '';
    const reason = searchParams.get('reason') || '';
    if (gmail === 'connected') {
      const updated = searchParams.get('updated') === '1';
      toast.success(
        updated
          ? email
            ? `Gmail atualizado: ${email} (sem criar canal novo). Já pode responder se autorizou envio.`
            : 'Gmail atualizado (canal existente).'
          : email
            ? `Gmail conectado: ${email}. Use a sidebar E-mail para ler e responder.`
            : 'Gmail conectado — sincronizando.',
        { duration: 8000 },
      );
      refresh();
    } else if (gmail === 'error') {
      toast.error(
        reason === 'no_refresh_token'
          ? 'Google não devolveu refresh token. Revogue o app em myaccount.google.com/permissions e tente de novo.'
          : `Falha ao conectar Gmail: ${reason || 'erro desconhecido'}`,
      );
    }
    // limpa query da URL sem reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      url.searchParams.delete('email');
      url.searchParams.delete('reason');
      url.searchParams.delete('updated');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a
            href="/inbox"
            className="bq-button"
          >
            Abrir inbox
          </a>
          <Button
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Conectar canal
          </Button>
        </div>
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
            <Button
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Conectar WhatsApp
            </Button>
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

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-3">
        {isError ? <p role="alert">Não foi possível carregar os canais. Tente novamente mais tarde.</p> : isLoading ? (
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
            <Button
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Conectar WhatsApp
            </Button>
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
