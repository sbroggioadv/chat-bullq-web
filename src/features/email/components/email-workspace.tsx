"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Mail, Pencil, PanelLeft } from "lucide-react";
import {
  type EmailThreadsPage,
  emailService,
  folderIdToParam,
  paramToFolderId,
} from "@/features/email/services/email.service";
import { EmailFolderList } from "@/features/email/components/email-folder-list";
import { EmailThreadList } from "@/features/email/components/email-thread-list";
import { EmailThreadView } from "@/features/email/components/email-thread-view";
import { channelsService } from "@/features/channels/services/channels.service";
import { Button, Sheet } from "@/components/ui/foundation";
import { EmailCompose } from "@/features/email/components/email-compose";
import { toast } from "sonner";

const SYSTEM_NAMES: Record<string, string> = {
  INBOX: "Caixa de entrada",
  SENT: "Enviados",
  SPAM: "Spam",
};

/**
 * /email — layout 3 colunas (pastas | threads | leitura), SPEC-004 W1.
 * Estado de navegação vive na URL (?folder=, ?threadId=, ?channel=) pra
 * refresh/share/deep-link preservarem a visão.
 */
export function EmailWorkspace() {
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const folderId = paramToFolderId(searchParams.get("folder"));
  const threadId = searchParams.get("threadId") || searchParams.get("thread");
  const channelParam = searchParams.get("channel");

  const statusQuery = useQuery({
    queryKey: ["email-status"],
    queryFn: () => emailService.status(),
    staleTime: 60000,
  });
  const channels = statusQuery.data?.channels ?? [];
  const channelId =
    channelParam && channels.some((c) => c.id === channelParam)
      ? channelParam
      : channels[0]?.id;

  const foldersQuery = useQuery({
    queryKey: ["email-folders", channelId],
    queryFn: () => emailService.folders(channelId!),
    enabled: !!channelId,
    staleTime: 60000,
  });

  const threadsQuery = useInfiniteQuery({
    queryKey: ["email-threads", channelId, folderId],
    queryFn: ({ pageParam }) =>
      emailService.threads(channelId!, folderId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: !!channelId,
    staleTime: 30000,
  });

  const threadQuery = useQuery({
    queryKey: ["email-thread", channelId, threadId],
    queryFn: () => emailService.thread(channelId!, threadId!),
    enabled: !!channelId && !!threadId,
    staleTime: 30000,
  });

  const navigate = useCallback(
    (nextFolderId: string, nextThreadId?: string, nextChannelId?: string) => {
      const p = new URLSearchParams();
      p.set("folder", folderIdToParam(nextFolderId));
      const ch = nextChannelId ?? channelParam;
      if (ch) p.set("channel", ch);
      if (nextThreadId) p.set("threadId", nextThreadId);
      router.push(`/email?${p.toString()}`);
    },
    [router, channelParam],
  );

  const markThreadReadInCache = useCallback(
    (id: string) => {
      if (!channelId) return;
      queryClient.setQueriesData(
        { queryKey: ["email-threads", channelId] },
        (old: InfiniteData<EmailThreadsPage> | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              threads: (page.threads || []).map((t) =>
                t.id === id ? { ...t, unread: false } : t,
              ),
            })),
          };
        },
      );
    },
    [channelId, queryClient],
  );

  // Ao abrir o thread: some a bolinha na lista (cache) quando Gmail confirmou lido.
  useEffect(() => {
    if (!channelId || !threadId || !threadQuery.data) return;
    const detail = threadQuery.data;
    if (detail.markedRead === true || detail.unread === false) {
      markThreadReadInCache(threadId);
    }
  }, [channelId, threadId, threadQuery.data, markThreadReadInCache]);

  // Clique na lista: limpa bolinha na hora (otimista), Gmail confirma no GET thread
  const selectThread = useCallback(
    (id: string) => {
      markThreadReadInCache(id);
      navigate(folderId, id);
    },
    [folderId, markThreadReadInCache, navigate],
  );

  if (statusQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--bq-hair-strong)] border-t-transparent" />
      </div>
    );
  }

  if (statusQuery.isError || !statusQuery.data?.connected || !channelId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Mail className="h-12 w-12 text-[var(--bq-t3)] " />
        <div>
          <p className="text-base font-medium text-[var(--bq-t1)] ">
            {statusQuery.isError
              ? "Não foi possível verificar a conexão de e-mail"
              : "Nenhuma conta Gmail conectada"}
          </p>
          <p className="mt-1 text-sm text-[var(--bq-t3)] ">
            {statusQuery.isError
              ? "Tente recarregar a página. Se o problema continuar, fale com o administrador."
              : "Conecte um canal Gmail para ver seus e-mails aqui."}
          </p>
        </div>
        {!statusQuery.isError && (
          <Link
            href="/settings/channels"
            className="rounded-md bg-[var(--bq-solid-bg)] px-3 py-1.5 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-accent-soft)]"
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
    "Pasta";
  const threads =
    threadsQuery.data?.pages.flatMap((page) => page.threads) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-[14px] px-5 py-[18px] text-[13px] text-[var(--bq-t1)] antialiased">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-[1.1] font-[family-name:var(--bq-f-display)] font-medium tracking-[-0.02em]">
            E-mail
          </h1>
          <p className="mt-[5px] text-[11.5px] text-[var(--bq-t3)]">
            <span className="mr-1.5 inline-block size-[7px] rounded-full bg-[var(--bq-ok)]" />
            Gmail ·{" "}
            {channels.find((channel) => channel.id === channelId)?.email ||
              channels.find((channel) => channel.id === channelId)?.name}{" "}
            · e-mail de cliente abre a conversa no atendimento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="solid" onClick={() => setComposing(true)}>
            <Pencil size={14} />
            Escrever
          </Button>
        </div>
      </header>
      <Sheet
        title="Pastas e contas"
        open={foldersOpen}
        onClose={() => setFoldersOpen(false)}
      >
        <EmailFolderList
          channels={channels}
          activeChannelId={channelId}
          onChannelChange={(id) => {
            navigate("INBOX", undefined, id);
            setFoldersOpen(false);
          }}
          folders={folders}
          activeFolderId={folderId}
          onSelectFolder={(id) => {
            navigate(id);
            setFoldersOpen(false);
          }}
          loading={foldersQuery.isPending}
          error={foldersQuery.isError}
          onRetry={() => foldersQuery.refetch()}
        />
      </Sheet>
      {composing && (
        <EmailCompose
          channelId={channelId}
          onClose={() => setComposing(false)}
          onSent={() => threadsQuery.refetch()}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)]">
        <div className="flex items-center border-b border-[var(--bq-hair)] px-2 py-1 min-[1121px]:hidden">
          <button
            type="button"
            className="bq-icon"
            aria-label="Pastas e contas"
            onClick={() => setFoldersOpen(true)}
          >
            <PanelLeft size={16} />
          </button>
          <span className="ml-1 text-xs text-[var(--bq-t3)]">{folderName}</span>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Pastas e contas"
            className="hidden w-[210px] shrink-0 min-[1121px]:flex"
          >
            <EmailFolderList
              channels={channels}
              activeChannelId={channelId}
              onChannelChange={(id) => {
                navigate("INBOX", undefined, id);
              }}
              folders={folders}
              activeFolderId={folderId}
              onSelectFolder={(id) => {
                navigate(id);
              }}
              loading={foldersQuery.isPending}
              error={foldersQuery.isError}
              onRetry={() => foldersQuery.refetch()}
            />
          </nav>
          {/* Lista — no mobile ocupa a tela até abrir um thread */}
          <div
            className={`w-full min-w-0 shrink-0 md:flex md:w-[340px] ${
              threadId ? "hidden" : "flex"
            }`}
          >
            <EmailThreadList
              folderName={folderName}
              threads={threads}
              activeThreadId={threadId}
              onSelect={selectThread}
              loading={threadsQuery.isPending}
              error={threadsQuery.isError}
              onRetry={() => threadsQuery.refetch()}
              hasMore={!!threadsQuery.hasNextPage}
              loadingMore={threadsQuery.isFetchingNextPage}
              onLoadMore={() => threadsQuery.fetchNextPage()}
            />
          </div>

          {/* Leitura */}
          <div
            className={`min-w-0 flex-1 md:flex ${threadId ? "flex" : "hidden"}`}
          >
            <EmailThreadView
              key={threadId}
              detail={threadQuery.data}
              channelId={channelId}
              threadSelected={!!threadId}
              loading={threadQuery.isPending && !!threadId}
              error={threadQuery.isError}
              onRetry={() => threadQuery.refetch()}
              onBack={() => navigate(folderId)}
              onSent={() => {
                threadQuery.refetch();
                threadsQuery.refetch();
              }}
              onReauth={async () => {
                try {
                  const ch = statusQuery.data?.channels[0];
                  const { url } = await channelsService.gmailOAuthStart({
                    name: ch?.name,
                    channelId: ch?.id || channelId,
                  });
                  window.location.href = url;
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Falha ao iniciar reconexão Google",
                  );
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
