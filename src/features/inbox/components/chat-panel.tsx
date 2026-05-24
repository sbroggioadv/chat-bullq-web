'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Clock, AlertCircle, ExternalLink, Reply, Trash2, X, Ban, Forward } from 'lucide-react';
import { ForwardMessageDialog } from './forward-message-dialog';
import { toast } from 'sonner';
import { inboxService, type Conversation, type Message } from '../services/inbox.service';
import { ChatInput, validateFile, type ChatInputHandle } from './chat-input';
import { ConversationHeader } from './conversation-header';
import { StoryReplyCard } from './story-reply-card';
import { AudioMessagePlayer } from './audio-message-player';
import {
  MediaImage,
  MediaVideo,
  MediaDocument,
  MediaSticker,
  MediaLocation,
} from './media-bubbles';
import { useSocket } from '../hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { PendingActionsList } from '../pending-actions/pending-actions-list';

function translateSkipReason(reason: string): string {
  const map: Record<string, string> = {
    GROUP_NOT_WHITELISTED: 'IA não habilitada nesse grupo',
    GROUP_NO_MENTION: 'Sem menção @ ou reply',
    ORG_AI_DISABLED: 'IA da org desligada',
    CONV_AI_FORCED_OFF: 'IA forçada OFF nessa conversa',
    NO_AGENT_MATCH: 'Sem agente compatível',
    CHANNEL_CAP_HOUR: 'Cap horário do canal atingido',
    CONV_CONSECUTIVE_CAP: 'Cap consecutivo da conversa atingido',
    'no-agent-for-channel': 'Sem agente ativo no canal',
    'outside-business-hours': 'Fora do horário comercial',
    'monthly-token-cap-reached': 'Cap mensal de tokens atingido',
    'conversation.aiEnabled=force-off': 'IA forçada OFF',
    'channel.aiEnabled=force-off': 'IA do canal desligada',
    'org.aiEnabled=false': 'IA da org desligada',
  };
  return map[reason] || reason;
}

interface ChatPanelProps {
  conversation: Conversation;
  onConversationUpdate: () => void;
  /** Forwarded to ConversationHeader so the agent-runs sidebar toggle
   *  shows up in the chat header. */
  onToggleAgentLogs?: () => void;
  agentLogsOpen?: boolean;
}

const statusIcons: Record<string, React.ElementType> = {
  QUEUED: Clock,
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: CheckCheck,
  FAILED: AlertCircle,
};

/**
 * Banner de aviso quando a conversa está fora da "janela de atendimento"
 * do WhatsApp (24h sem mensagem do cliente). Sem template aprovado, qualquer
 * mensagem livre é rejeitada pelo provider com `failed_reason: Re-engagement
 * message`.
 *
 * Heurística client-side: olha as últimas mensagens já carregadas e procura
 * a última INBOUND. Se nenhuma encontrada nos buffer atual, OU se ela é mais
 * velha que 24h, mostra o banner. Não 100% preciso (paginação pode esconder
 * inbound antiga) mas resolve >95% dos casos sem precisar de campo novo no
 * backend.
 */
function EngagementWindowBanner({
  channelType,
  messages,
}: {
  channelType: string;
  messages: Message[];
}) {
  // Janela 24h é regra rígida APENAS do WhatsApp Cloud API oficial (Meta).
  // Canais Zappfy/Uazapi (WHATSAPP_ZAPPFY) não têm essa restrição — banner
  // ali confunde mais que ajuda.
  if (channelType !== 'WHATSAPP_OFFICIAL') return null;
  if (messages.length === 0) return null;

  const lastInbound = [...messages]
    .reverse()
    .find((m) => m.direction === 'INBOUND');
  if (!lastInbound) return null;

  const ageMs = Date.now() - new Date(lastInbound.createdAt).getTime();
  const ageHours = ageMs / (60 * 60 * 1000);
  if (ageHours < 24) return null;

  const ageLabel =
    ageHours < 48
      ? `${Math.floor(ageHours)}h`
      : `${Math.floor(ageHours / 24)} dias`;

  return (
    <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="flex-1 leading-relaxed">
        <strong>Janela de 24h expirada</strong> — última mensagem do cliente
        foi há {ageLabel}. WhatsApp só aceita{' '}
        <strong>templates aprovados</strong> agora. Mensagem de texto livre
        vai falhar com erro <code className="font-mono text-[11px]">Re-engagement message</code>.
        Peça pro cliente mandar qualquer mensagem pra reabrir a janela, ou
        envie um template HSM via Meta Business.
      </div>
    </div>
  );
}

/**
 * Tooltip humano pra cada status. Especial pra FAILED com motivo conhecido
 * — operador entende que precisa de template em vez de relê o erro do
 * provider em inglês ("Re-engagement message").
 */
function statusTooltip(status: string, failedReason?: string | null): string {
  switch (status) {
    case 'QUEUED':
      return 'Enviando…';
    case 'SENT':
      return 'Enviado pro provedor';
    case 'DELIVERED':
      return 'Entregue ao destinatário';
    case 'READ':
      return 'Lida';
    case 'FAILED':
      if (failedReason && /re-?engagement/i.test(failedReason)) {
        return 'Falhou: cliente sem mensagem há mais de 24h. Use um template aprovado pra reabrir a conversa.';
      }
      if (failedReason) return `Falhou: ${failedReason}`;
      return 'Falhou ao enviar';
    default:
      return status;
  }
}

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const IG_CDN_HOSTS = /(lookaside\.fbsbx\.com|cdninstagram\.com|fbcdn\.net)/i;

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkPreviewCard({ url, isOutbound }: { url: string; isOutbound: boolean }) {
  const [imgOk, setImgOk] = useState(IG_CDN_HOSTS.test(url));
  const host = safeHostname(url);

  if (imgOk) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt="Mídia compartilhada"
          className="max-h-64 rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
          onError={() => setImgOk(false)}
        />
        <span
          className={`mt-1 block text-[10px] ${
            isOutbound ? 'opacity-80' : 'text-zinc-400'
          }`}
        >
          {host}
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
        isOutbound
          ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15'
          : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800'
      }`}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="truncate font-medium">{host}</span>
    </a>
  );
}

function matchSingleUrl(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^(https?:\/\/\S+)$/i);
  return m ? m[1] : null;
}

function renderInlineTextWithLinks(text: string, isOutbound: boolean) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 wrap-break-word ${
            isOutbound ? 'text-primary-foreground' : 'text-primary'
          }`}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageText({
  text,
  isOutbound,
  className = '',
}: {
  text: string;
  isOutbound: boolean;
  className?: string;
}) {
  const onlyUrl = matchSingleUrl(text);
  if (onlyUrl) {
    return <LinkPreviewCard url={onlyUrl} isOutbound={isOutbound} />;
  }
  return (
    <p className={`whitespace-pre-wrap wrap-break-word text-sm ${className}`}>
      {renderInlineTextWithLinks(text, isOutbound)}
    </p>
  );
}

interface TemplateButtonShape {
  type?: string;
  title?: string;
  url?: string;
  payload?: string;
}

interface TemplateElementShape {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  defaultActionUrl?: string;
  buttons?: TemplateButtonShape[];
}

function TemplateButtonRow({
  buttons,
  isOutbound,
}: {
  buttons: TemplateButtonShape[];
  isOutbound: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {buttons.map((btn, i) => {
        const label = btn.title || btn.url || btn.payload || 'Botão';
        const baseClass = `block rounded-md border px-3 py-1.5 text-center text-xs font-medium transition-colors ${
          isOutbound
            ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20'
            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800'
        }`;
        if (btn.url) {
          return (
            <a key={i} href={btn.url} target="_blank" rel="noopener noreferrer" className={baseClass}>
              {label}
            </a>
          );
        }
        return (
          <span
            key={i}
            className={`${baseClass} cursor-default opacity-80`}
            title={btn.payload || btn.type || ''}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function TemplateMessage({
  content,
  isOutbound,
}: {
  content: Record<string, any>;
  isOutbound: boolean;
}) {
  const tpl = (content?.template ?? {}) as {
    templateType?: string;
    text?: string;
    buttons?: TemplateButtonShape[];
    elements?: TemplateElementShape[];
  };
  const headerText = tpl.text || content?.text;
  const elements = tpl.elements ?? [];
  const buttons = tpl.buttons ?? [];

  return (
    <div className="space-y-2">
      {headerText && <MessageText text={headerText} isOutbound={isOutbound} />}

      {elements.map((el, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-lg border ${
            isOutbound
              ? 'border-primary-foreground/20 bg-primary-foreground/5'
              : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60'
          }`}
        >
          {el.imageUrl && (
            <a
              href={el.defaultActionUrl || el.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={el.imageUrl}
                alt={el.title || 'Template'}
                className="max-h-48 w-full object-cover"
              />
            </a>
          )}
          {(el.title || el.subtitle) && (
            <div className="px-3 py-2">
              {el.title && <p className="text-sm font-medium">{el.title}</p>}
              {el.subtitle && (
                <p className="mt-0.5 text-xs opacity-75">{el.subtitle}</p>
              )}
            </div>
          )}
          {el.buttons && el.buttons.length > 0 && (
            <div className="px-3 pb-2">
              <TemplateButtonRow buttons={el.buttons} isOutbound={isOutbound} />
            </div>
          )}
        </div>
      ))}

      {buttons.length > 0 && <TemplateButtonRow buttons={buttons} isOutbound={isOutbound} />}

      {!headerText && elements.length === 0 && buttons.length === 0 && (
        <p className="text-sm italic opacity-70">[Template]</p>
      )}
    </div>
  );
}

function ContactAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '??').slice(0, 2).toUpperCase();
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-sm';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className={`${dim} shrink-0 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400`}
    >
      {initials}
    </div>
  );
}

export function ChatPanel({
  conversation,
  onConversationUpdate,
  onToggleAgentLogs,
  agentLogsOpen,
}: ChatPanelProps) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { on, emit, onReconnect } = useSocket();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => inboxService.getMessages(conversation.id),
    // Defenses against socket gaps: refetch when the tab regains focus
    // and on browser-level reconnect. Realtime is the happy path; these
    // catch the case where a `message:new` was missed.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
  });

  const messages = data?.messages || [];

  // S22 — AI WS indicators
  const [aiTyping, setAiTyping] = useState<{ agentName: string; etaMs: number; until: number } | null>(null);
  const [aiSkip, setAiSkip] = useState<{ reason: string; until: number } | null>(null);

  useEffect(() => {
    emit('join:conversation', { conversationId: conversation.id });
    return () => {
      emit('leave:conversation', { conversationId: conversation.id });
    };
  }, [conversation.id, emit]);

  useEffect(() => {
    const unsubNew = on('message:new', (payload: any) => {
      const msg = payload.message;
      if (!msg) return;
      const convId = payload.conversationId ?? msg.conversationId;
      if (convId !== conversation.id) return;

      // Merge into the current cache. If there's no cache yet (initial
      // fetch still in flight, or cache evicted) we DON'T discard the
      // event — we invalidate so the refetch picks the new message up.
      const existingCache = queryClient.getQueryData<{ messages: Message[] }>([
        'messages',
        conversation.id,
      ]);
      if (!existingCache) {
        queryClient.invalidateQueries({
          queryKey: ['messages', conversation.id],
        });
      } else {
        queryClient.setQueryData<{ messages: Message[] }>(
          ['messages', conversation.id],
          (prev) => {
            if (!prev) return prev;
            const existing = prev.messages || [];
            // Dedup by id (authoritative) or by externalId when present.
            const match = existing.findIndex(
              (m) =>
                m.id === msg.id ||
                (msg.externalId && m.externalId && m.externalId === msg.externalId),
            );
            if (match !== -1) {
              const merged = [...existing];
              merged[match] = { ...existing[match], ...msg };
              return { ...prev, messages: merged };
            }
            return { ...prev, messages: [...existing, msg] };
          },
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const unsubStatus = on('message:status', (payload: any) => {
      if (payload.conversationId !== conversation.id) return;
      const ids: string[] = payload.messageIds ?? (payload.messageId ? [payload.messageId] : []);
      if (ids.length === 0) return;
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              ids.includes(m.id) ? { ...m, status: payload.status } : m,
            ),
          };
        },
      );
    });
    // conversation:assigned — emitido pelo server quando auto-assign acontece
    // no envio de uma mensagem (messages.service.send linhas 206-223). Sem
    // este listener, a mudança de assignee só aparece no próximo refetch
    // periódico (5s) da inbox. Invalidamos a conversation aberta + lista.
    const unsubAssigned = on('conversation:assigned', (payload: any) => {
      if (payload?.conversationId !== conversation.id) return;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // conversation:ai-toggle — emitido quando a IA é desligada por intervenção
    // humana (messages.service.send linhas 227-237). Sem listener, o toggle
    // visual da IA fica desatualizado até o próximo refetch.
    const unsubAiToggle = on('conversation:ai-toggle', (payload: any) => {
      if (payload?.conversationId !== conversation.id) return;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
    });
    // Reconnect: any messages that arrived during the offline window are
    // gone from this client's perspective (socket misses events while
    // disconnected). Refetch the open conversation's messages on every
    // reconnect, plus the conversation list, so the user comes back to a
    // correct view without having to F5.
    const unsubReconnect = onReconnect(() => {
      queryClient.invalidateQueries({
        queryKey: ['messages', conversation.id],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // Watchdog/admin revogou uma mensagem — pinta a bolha como "deletada"
    // pra todo mundo que tá com a conversa aberta, sem refresh.
    const unsubRevoked = on('message:revoked', (payload: any) => {
      if (payload?.conversationId !== conversation.id) return;
      if (!payload?.messageId) return;
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    revokedAt: payload.revokedAt,
                    revokedBy: payload.revokedBy,
                    revokeSucceededRemote: payload.succeededRemote,
                  }
                : m,
            ),
          };
        },
      );
    });
    // S22 — AI typing indicator
    const unsubAiTyping = on('ai:typing', (payload: { agentId: string; agentName: string; etaMs: number }) => {
      if ((payload as any).conversationId && (payload as any).conversationId !== conversation.id) return;
      setAiTyping({
        agentName: payload.agentName,
        etaMs: payload.etaMs,
        until: Date.now() + payload.etaMs,
      });
    });
    // S22 — AI scope-skipped indicator
    const unsubAiScopeSkip = on('ai:scope-skipped', (payload: { reason: string }) => {
      setAiSkip({ reason: payload.reason, until: Date.now() + 30_000 });
    });
    // S22 — AI cadence-skipped indicator
    const unsubAiCadenceSkip = on('ai:cadence-skipped', (payload: { reason: string }) => {
      setAiSkip({ reason: payload.reason, until: Date.now() + 30_000 });
    });

    return () => {
      unsubNew?.();
      unsubStatus?.();
      unsubAssigned?.();
      unsubAiToggle?.();
      unsubReconnect?.();
      unsubRevoked?.();
      unsubAiTyping?.();
      unsubAiScopeSkip?.();
      unsubAiCadenceSkip?.();
    };
  }, [conversation.id, on, onReconnect, queryClient]);

  const handleRevoke = useCallback(
    async (msg: Message) => {
      const ok = window.confirm(
        'Deletar essa mensagem pra todos? ' +
          'Em WhatsApp via Zappfy a mensagem some no app do cliente. ' +
          'Em WhatsApp Cloud API e Instagram, ela some apenas no Chat BullQ ' +
          '(limitação da Meta — o cliente continua vendo no app dele).',
      );
      if (!ok) return;
      try {
        const result = await inboxService.revokeMessage(msg.id);
        if (result.succeededRemote) {
          toast.success('Mensagem deletada pra todos');
        } else {
          toast.warning(
            'Mensagem deletada só no Chat BullQ. ' +
              'O cliente ainda vê a mensagem no app dele (limitação do canal).',
          );
        }
        // Otimista: marca local enquanto o realtime não chega
        queryClient.setQueryData<{ messages: Message[] } | undefined>(
          ['messages', conversation.id],
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      revokedAt: result.revokedAt,
                      revokedBy: result.revokedBy,
                      revokeSucceededRemote: result.succeededRemote,
                    }
                  : m,
              ),
            };
          },
        );
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            'Erro ao deletar mensagem',
        );
      }
    },
    [conversation.id, queryClient],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // S22 — Auto-clear AI typing banner after ETA expires
  useEffect(() => {
    if (!aiTyping) return;
    const t = setTimeout(() => setAiTyping(null), aiTyping.etaMs + 500);
    return () => clearTimeout(t);
  }, [aiTyping]);

  // S22 — Auto-clear AI skip banner after 30s
  useEffect(() => {
    if (!aiSkip) return;
    const t = setTimeout(() => setAiSkip(null), 30_000);
    return () => clearTimeout(t);
  }, [aiSkip]);

  // Reply state — quando setado, próxima msg enviada vai com replyToMessageId
  // e a UI mostra a barra "respondendo a..." acima do input. Reseta ao
  // trocar de conversa (via key prop do ChatPanel) ou ao mandar a msg.
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);

  const startReply = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);
  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const handleStartForward = useCallback((msg: Message) => {
    setForwarding(msg);
  }, []);

  const forwardPreview = (msg: Message): string => {
    const c = (msg.content ?? {}) as Record<string, any>;
    if (typeof c.text === 'string' && c.text) return c.text.slice(0, 120);
    if (typeof c.caption === 'string' && c.caption) return c.caption.slice(0, 120);
    if (msg.type === 'IMAGE') return '[Imagem]';
    if (msg.type === 'AUDIO') return '[Áudio]';
    if (msg.type === 'VIDEO') return '[Vídeo]';
    if (msg.type === 'DOCUMENT') return c.fileName ? `[Documento: ${c.fileName}]` : '[Documento]';
    return `[${msg.type}]`;
  };

  // Helper: insere a Message recém-criada (resposta do POST) na cache local
  // imediatamente, antes do WS broadcast chegar. Isso evita o gap visível
  // em headless/Playwright (e em conexões WS lentas) onde o snapshot da UI
  // saía sem a bolha outbound. O handler `message:new` (acima) faz dedup por
  // `id`, então o broadcast subsequente apenas merge-update o status sem
  // duplicar.
  const upsertMessageInCache = useCallback(
    (msg: Message) => {
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          const existing = prev.messages || [];
          const match = existing.findIndex(
            (m) =>
              m.id === msg.id ||
              (msg.externalId && m.externalId && m.externalId === msg.externalId),
          );
          if (match !== -1) {
            const merged = [...existing];
            merged[match] = { ...existing[match], ...msg };
            return { ...prev, messages: merged };
          }
          return { ...prev, messages: [...existing, msg] };
        },
      );
    },
    [conversation.id, queryClient],
  );

  const handleSend = async (text: string) => {
    // Optimistic insert: server retorna a Message QUEUED já no body do POST.
    // Inserimos imediatamente; o `message:new` do WS chega depois e faz
    // merge no mesmo id (handler acima já tem dedup). Antes desse fix a UI
    // dependia 100% do WS broadcast, o que falhava em contexto headless.
    const replyToMessageId = replyingTo?.id;
    try {
      const created = await inboxService.sendMessage({
        conversationId: conversation.id,
        type: 'TEXT',
        content: { text },
        replyToMessageId,
      });
      if (created) {
        upsertMessageInCache(created);
      }
      setReplyingTo(null);
    } catch (err) {
      // Fallback: if send fails, force a refresh to drop any stale UI state.
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    try {
      const created = await inboxService.sendAudioMessage(conversation.id, blob);
      if (created) {
        upsertMessageInCache(created);
      }
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  /**
   * S18/W3-Z: polymorphic file send. Backend detecta tipo via MIME + magic bytes
   * e retorna contentTypeBucket; service mapeia pro Message.contentType.
   */
  const handleSendFile = async (file: File, caption?: string) => {
    try {
      const created = await inboxService.sendFileMessage(
        conversation.id,
        file,
        caption,
      );
      if (created) {
        upsertMessageInCache(created);
      }
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  // Panel-wide drag-and-drop — the composer's drop zone is tiny compared to
  // the timeline, and users naturally drag onto the messages area. We hand
  // the file off to ChatInput's imperative `queueImage` so the preview +
  // optional-caption flow is identical to paste/picker.
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  // dragCounter handles the React quirk where dragenter/dragleave fire for
  // every child element the cursor crosses — without counting, the ring
  // flickers on every nested element transition.
  const dragCounterRef = useRef(0);

  const handlePanelDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsPanelDragging(true);
  };
  const handlePanelDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    // Necessary — without it, drop is silently swallowed by the browser's
    // default "open file" handler.
    e.preventDefault();
  };
  const handlePanelDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsPanelDragging(false);
  };
  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsPanelDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // S18/W3-Z: aceita qualquer tipo válido (image/audio/video/document).
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    chatInputRef.current?.queueFile(file);
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    // min-h-0 é load-bearing: sem ele, o scroll-container interno cresce
    // pelo conteúdo (default min-height de flex children) e empurra o
    // ChatInput pra fora do painel — quebra dramaticamente quando o pai
    // é um modal com altura fixa.
    <div
      className={`relative flex min-h-0 min-w-0 flex-1 flex-col transition-colors ${
        isPanelDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary/40' : ''
      }`}
      onDragEnter={handlePanelDragEnter}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      {isPanelDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]">
          <div className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg">
            Solte o arquivo para anexar
          </div>
        </div>
      )}
      <ConversationHeader
        conversation={conversation}
        onUpdate={onConversationUpdate}
        onToggleAgentLogs={onToggleAgentLogs}
        agentLogsOpen={agentLogsOpen}
      />

      <PendingActionsList conversationId={conversation.id} />

      {aiTyping && (
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span>🤖 {aiTyping.agentName} está digitando…</span>
          <span className="text-zinc-400">(~{Math.ceil(aiTyping.etaMs / 1000)}s)</span>
        </div>
      )}
      {aiSkip && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span>⏸ IA pausada · {translateSkipReason(aiSkip.reason)}</span>
        </div>
      )}

      <EngagementWindowBanner
        channelType={conversation.channel.type}
        messages={messages}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-50 p-4 dark:bg-zinc-900/50">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Nenhuma mensagem ainda
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
            {(() => {
              const reactionMap = new Map<string, string[]>();
              for (const msg of messages) {
                if (msg.type === 'REACTION' && msg.content?.reaction) {
                  const targetId = msg.content.reaction.targetMessageId;
                  if (targetId) {
                    const existing = reactionMap.get(targetId) || [];
                    existing.push(msg.content.reaction.emoji);
                    reactionMap.set(targetId, existing);
                  }
                }
              }
              return messages.filter((m) => m.type !== 'REACTION').map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND';
                const StatusIcon = statusIcons[msg.status] || Clock;
                const reactions = reactionMap.get(msg.externalId || '') || [];
                const isRevoked = !!msg.revokedAt;
                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`group flex items-end gap-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Botão "Responder" no hover. Aparece do lado de
                        FORA da bolha — esquerda quando outbound (msg
                        nossa, espaço à direita da bolha), direita quando
                        inbound (msg do cliente, espaço à esquerda).
                        Reactions e bolhas curtas mantêm o botão visível.
                        Mensagens já revogadas não mostram ações. */}
                    {isOutbound && !isRevoked && (
                      <div className="flex items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          className="rounded-full bg-white p-1.5 text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:text-zinc-100"
                          title="Responder"
                          aria-label="Responder esta mensagem"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartForward(msg)}
                          className="rounded-full bg-white p-1.5 text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:text-zinc-100"
                          title="Encaminhar"
                          aria-label="Encaminhar esta mensagem"
                        >
                          <Forward className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(msg)}
                          className="rounded-full bg-white p-1.5 text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:text-red-600 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:text-red-400"
                          title="Deletar pra todos"
                          aria-label="Deletar mensagem pra todos"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {!isOutbound && (
                      <ContactAvatar
                        size="sm"
                        name={
                          conversation.isGroup && msg.senderName
                            ? msg.senderName
                            : conversation.contact.name
                        }
                        avatarUrl={
                          conversation.isGroup ? null : conversation.contact.avatarUrl
                        }
                      />
                    )}
                    <div className="relative max-w-[75%]">
                      {conversation.isGroup && !isOutbound && msg.senderName && (
                        <p className="mb-0.5 ml-1 text-xs font-semibold text-primary">
                          {msg.senderName}
                        </p>
                      )}
                      {isOutbound && (msg.sender?.name || (msg.senderId && msg.senderId === user?.id && user?.name)) && (
                        <p className="mb-0.5 mr-1 text-right text-xs font-semibold text-primary">
                          {msg.sender?.name || user?.name}
                        </p>
                      )}
                      {msg.metadata?.replyTo?.story && (
                        <StoryReplyCard
                          story={msg.metadata.replyTo.story}
                          isOutbound={isOutbound}
                        />
                      )}
                      {msg.metadata?.replyTo?.ad && (
                        <div
                          className={`mb-1 rounded-xl border px-3 py-2 text-xs ${
                            isOutbound
                              ? 'border-primary/40 bg-primary/10 text-primary-foreground/80'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wider opacity-70">
                            Respondeu ao anúncio
                          </p>
                          {msg.metadata.replyTo.ad.title && (
                            <p className="mt-0.5 font-medium">
                              {msg.metadata.replyTo.ad.title}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Quote box: aparece quando a msg respondeu outra
                          mensagem (reply nativo do WhatsApp/Cloud API ou
                          fallback do Instagram que persistimos via
                          metadata.replyTo). Click scrolla até a msg
                          original quando a temos no histórico carregado. */}
                      {msg.metadata?.replyTo &&
                        (msg.metadata.replyTo.previewText ||
                          msg.metadata.replyTo.senderName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = msg.metadata?.replyTo?.messageId;
                              if (!targetId) return;
                              const el = document.getElementById(
                                `msg-${targetId}`,
                              );
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('ring-2', 'ring-primary');
                                setTimeout(
                                  () =>
                                    el.classList.remove('ring-2', 'ring-primary'),
                                  1500,
                                );
                              }
                            }}
                            className={`mb-1 block w-full rounded-md border-l-2 border-primary px-2 py-1 text-left text-xs ${
                              isOutbound
                                ? 'bg-primary/10 text-primary-foreground/80'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {msg.metadata.replyTo.senderName && (
                              <p className="text-[10px] font-semibold opacity-80">
                                {msg.metadata.replyTo.senderName}
                              </p>
                            )}
                            {msg.metadata.replyTo.previewText && (
                              <p className="mt-0.5 truncate">
                                {msg.metadata.replyTo.previewText}
                              </p>
                            )}
                          </button>
                        )}
                      {isRevoked ? (
                        <div
                          className={`flex items-center gap-2 rounded-2xl border border-dashed px-4 py-2.5 italic ${
                            isOutbound
                              ? 'rounded-br-md border-primary/40 bg-primary/5 text-primary/70'
                              : 'rounded-bl-md border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-500'
                          }`}
                          title={
                            msg.revokeSucceededRemote
                              ? 'Mensagem deletada pra todos (provider confirmou).'
                              : 'Deletada apenas no Chat BullQ — o cliente ainda pode estar vendo no app dele.'
                          }
                        >
                          <Ban className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">
                            Mensagem deletada
                            {msg.revokeSucceededRemote === false ? ' (só aqui)' : ''}
                          </span>
                          <span className="ml-auto text-[10px] opacity-70">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      ) : msg.type === 'AUDIO' ? (
                        <>
                          <AudioMessagePlayer
                            message={msg}
                            isOutbound={isOutbound}
                            onTranscribed={() => {
                              queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
                            }}
                          />
                          <div
                            className={`mt-1 flex items-center gap-1 px-1 text-[10px] ${
                              isOutbound ? 'justify-end text-zinc-400' : 'text-zinc-400'
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOutbound && (
                              <span title={statusTooltip(msg.status, msg.failedReason)}>
                                <StatusIcon
                                  className={`h-3 w-3 ${
                                    msg.status === 'FAILED'
                                      ? 'text-red-500'
                                      : msg.status === 'READ'
                                        ? 'text-primary'
                                        : ''
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOutbound
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md bg-white shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                          }`}
                        >
                          {msg.type === 'TEXT' ? (
                            <MessageText
                              text={msg.content?.text || ''}
                              isOutbound={isOutbound}
                            />
                          ) : msg.type === 'IMAGE' ? (
                            <MediaImage message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'VIDEO' ? (
                            <MediaVideo message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'DOCUMENT' ? (
                            <MediaDocument message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'STICKER' ? (
                            <MediaSticker message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'LOCATION' ? (
                            <MediaLocation message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'TEMPLATE' ? (
                            <TemplateMessage content={msg.content} isOutbound={isOutbound} />
                          ) : (
                            <p className="text-sm italic opacity-70">[{msg.type}]</p>
                          )}
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] ${
                              isOutbound ? 'justify-end opacity-70' : 'text-zinc-400'
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOutbound && (
                              <span title={statusTooltip(msg.status, msg.failedReason)}>
                                <StatusIcon
                                  className={`h-3 w-3 ${
                                    msg.status === 'FAILED'
                                      ? 'text-red-300'
                                      : msg.status === 'READ'
                                        ? 'text-blue-300'
                                        : ''
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {reactions.length > 0 && (
                        <div className={`absolute -bottom-2 ${isOutbound ? 'right-2' : 'left-2'} flex gap-0.5`}>
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700">
                            {[...new Set(reactions)].join('')}
                            {reactions.length > 1 && (
                              <span className="ml-0.5 text-[10px] text-zinc-400">{reactions.length}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {!isOutbound && !isRevoked && (
                      <div className="flex items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          className="rounded-full bg-white p-1.5 text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:text-zinc-100"
                          title="Responder"
                          aria-label="Responder esta mensagem"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartForward(msg)}
                          className="rounded-full bg-white p-1.5 text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:text-zinc-100"
                          title="Encaminhar"
                          aria-label="Encaminhar esta mensagem"
                        >
                          <Forward className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {replyingTo && (
        <ReplyPreviewBar message={replyingTo} onCancel={cancelReply} />
      )}
      <ChatInput
        ref={chatInputRef}
        onSend={handleSend}
        onSendAudio={handleSendAudio}
        onSendFile={handleSendFile}
        disabled={conversation.status === 'CLOSED'}
      />
      {forwarding && (
        <ForwardMessageDialog
          open={!!forwarding}
          onClose={() => setForwarding(null)}
          sourceMessageId={forwarding.id}
          sourceConversationId={conversation.id}
          sourcePreview={forwardPreview(forwarding)}
        />
      )}
    </div>
  );
}

/**
 * Barra fina logo acima do ChatInput mostrando que estamos compondo uma
 * resposta a uma mensagem específica. X cancela. Replica o visual do
 * WhatsApp Web — borda colorida à esquerda + sender + preview truncado.
 */
function ReplyPreviewBar({
  message,
  onCancel,
}: {
  message: Message;
  onCancel: () => void;
}) {
  const sender =
    message.direction === 'OUTBOUND'
      ? message.sender?.name || 'Você'
      : (message.senderName ?? 'Cliente');
  const c = (message.content ?? {}) as Record<string, any>;
  const preview =
    (typeof c.text === 'string' && c.text) ||
    (typeof c.caption === 'string' && c.caption) ||
    `[${(message.type || 'mensagem').toLowerCase()}]`;
  return (
    <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs font-medium text-primary">Respondendo {sender}</p>
        <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
          {preview}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Cancelar resposta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
