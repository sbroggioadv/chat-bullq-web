'use client';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref, type RefObject } from 'react';
import type { Message } from '@/features/inbox/services/inbox.service';
import { conversationInsightsService } from '@/features/inbox/services/conversation-insights.service';

export interface ChatMessageJumpHandle { jumpToMessage: (messageId: string) => Promise<void> }
/** Adds search context locally; never replaces the live message cache or its pagination. */
export function useMessageJump(conversationId: string, recent: Message[], scroll: RefObject<((index: number) => void) | null>, ref?: Ref<ChatMessageJumpHandle>) {
  const [context, setContext] = useState<{ conversationId: string; messages: Message[] } | null>(null);
  const [target, setTarget] = useState<{ conversationId: string; id: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const handledTarget = useRef<typeof target>(null);
  useEffect(() => () => { request.current?.abort(); }, [conversationId]);
  const messages = useMemo(() => {
    if (context?.conversationId !== conversationId) return recent;
    const merged = new Map(context.messages.map(message => [message.id, message]));
    for (const message of recent) merged.set(message.id, message);
    return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }, [context, conversationId, recent]);
  const jumpToMessage = useCallback(async (messageId: string) => {
    if (!messageId.trim()) throw new Error('Mensagem inválida.');
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    if (!messages.some(message => message.id === messageId && message.type !== 'REACTION')) {
      const result = await conversationInsightsService.around(conversationId, messageId, controller.signal);
      if (controller.signal.aborted) throw new Error('Conversa alterada ou busca substituída.');
      if (!result.items.every(message => message.conversationId === conversationId) || !result.items.some(message => message.id === messageId && message.type !== 'REACTION')) throw new Error('Mensagem indisponível nesta conversa.');
      setContext(previous => ({ conversationId, messages: [...(previous?.conversationId === conversationId ? previous.messages : []), ...result.items] }));
    }
    setTarget({ conversationId, id: messageId });
  }, [conversationId, messages]);
  const handle = useMemo(() => ({ jumpToMessage }), [jumpToMessage]);
  useImperativeHandle(ref, () => handle, [handle]);
  useEffect(() => {
    if (!target || target.conversationId !== conversationId || handledTarget.current === target) return;
    const index = messages.filter(message => message.type !== 'REACTION').findIndex(message => message.id === target.id);
    if (index < 0) return;
    handledTarget.current = target;
    scroll.current?.(index);
    let element: HTMLElement | null = null;
    // VirtualList commits the destination row after scrollToIndex updates its viewport.
    const frame = requestAnimationFrame(() => {
      element = document.getElementById(`msg-${target.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.classList.add('ring-2', 'ring-primary');
    });
    const timer = setTimeout(() => element?.classList.remove('ring-2', 'ring-primary'), 2000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); element?.classList.remove('ring-2', 'ring-primary'); };
  }, [target, conversationId, messages, scroll]);
  return { messages, handle };
}
