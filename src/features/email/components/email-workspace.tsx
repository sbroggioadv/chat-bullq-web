'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import {
  emailService,
  folderIdToParam,
  paramToFolderId,
} from '../services/email.service';
import { EmailFolderList } from './email-folder-list';
import { EmailThreadList } from './email-thread-list';
import { EmailThreadView } from './email-thread-view';

const SYSTEM_NAMES: Record<string, string> = {
  INBOX: 'Caixa de entrada',
  SENT: 'Enviados',
  SPAM: 'Spam',
};

/**
 * /email — layout 3 colunas (pastas | threads | leitura), SPEC-004 W1.
 * Estado de navegação vive na URL (?folder=, ?threadId=, ?channel=) pra
 * refresh/share/deep-link preservarem a visão.
 */
export function EmailWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const folderId = paramToFolderId(searchParams.get('folder'));
  const threadId = searchParams.get('threadId');
  const channelParam = searchParams.get('channel');

  const statusQuery = useQuery({
    queryKey: ['email-status'],
    queryFn: () => emailService.status(),
    staleTime: 60000,
  });
  const channels = statusQuery.data?.channels ?? [];
  const channelId =
    channelParam && channels.some((c) => c.id === channelParam)
      ? channelParam
      : channels[0]?.id;

  const foldersQuery = useQuery({
    queryKey: ['email-folders', channelId],
    queryFn: () => emailService.folders(channelId!),
    enabled: !!channelId,
    staleTime: 60000,
  });

  const threadsQuery = useInfiniteQuery({
    queryKey: ['email-threads', channelId, folderId],
    queryFn: ({ pageParam }) =>
      emailService.threads(channelId!, folderId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: !!channelId,
    staleTime: 30000,
  });

  const threadQuery = useQuery({
    queryKey: ['email-thread', channelId, threadId],
    queryFn: () => emailService.thread(channelId!, threadId!),
    enabled: !!channelId && !!threadId,
    staleTime: 30000,
  });

  const navigate = useCallback(
    (nextFolderId: string, nextThreadId?: string, nextChannelId?: string) => {
      const p = new URLSearchParams();
      p.set('folder', folderIdToParam(nextFolderId));
      const ch = nextChannelId ?? channelParam;
      if (ch) p.set('channel', ch);
      if (nextThreadId) p.set('threadId', nextThreadId);
      router.push(`/email?${p.toString()}`);
    },
    [router, channelParam],
  );

  if (statusQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (statusQuery.isError || !statusQuery.data?.connected || !channelId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Mail className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
        <div>
          <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
            {statusQuery.isError
              ? 'Não foi possível verificar a conexão de e-mail'
              : 'Nenhuma conta Gmail conectada'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {statusQuery.isError
              ? 'Tente recarregar a página. Se o problema continuar, fale com o administrador.'
              : 'Conecte um canal Gmail para ver seus e-mails aqui.'}
          </p>
        </div>
        {!statusQuery.isError && (
          <Link
            href="/settings/channels"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Conectar com Google
          </Link>
        )}
      </div>
    );
  }

  const folders = foldersQuery.data?.folders ?? [];
  const folderName =
    folders.find((f) => f.id === folderId)?.name ??
    SYSTEM_NAMES[folderId] ??
    'Pasta';
  const threads =
    threadsQuery.data?.pages.flatMap((page) => page.threads) ?? [];

  return (
    <div className="flex h-full min-h-0">
      {/* Pastas — some no mobile (navegação pela sidebar) */}
      <div className="hidden w-56 shrink-0 md:flex lg:w-60">
        <EmailFolderList
          channels={channels}
          activeChannelId={channelId}
          onChannelChange={(id) => navigate('INBOX', undefined, id)}
          folders={folders}
          activeFolderId={folderId}
          onSelectFolder={(id) => navigate(id)}
          loading={foldersQuery.isPending}
          error={foldersQuery.isError}
          onRetry={() => foldersQuery.refetch()}
        />
      </div>

      {/* Lista — no mobile ocupa a tela até abrir um thread */}
      <div
        className={`w-full min-w-0 shrink-0 md:flex md:w-[340px] lg:w-[380px] ${
          threadId ? 'hidden' : 'flex'
        }`}
      >
        <EmailThreadList
          folderName={folderName}
          threads={threads}
          activeThreadId={threadId}
          onSelect={(id) => navigate(folderId, id)}
          loading={threadsQuery.isPending}
          error={threadsQuery.isError}
          onRetry={() => threadsQuery.refetch()}
          hasMore={!!threadsQuery.hasNextPage}
          loadingMore={threadsQuery.isFetchingNextPage}
          onLoadMore={() => threadsQuery.fetchNextPage()}
        />
      </div>

      {/* Leitura */}
      <div className={`min-w-0 flex-1 md:flex ${threadId ? 'flex' : 'hidden'}`}>
        <EmailThreadView
          detail={threadQuery.data}
          threadSelected={!!threadId}
          loading={threadQuery.isPending && !!threadId}
          error={threadQuery.isError}
          onRetry={() => threadQuery.refetch()}
          onBack={() => navigate(folderId)}
        />
      </div>
    </div>
  );
}
