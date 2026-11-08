import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRef, useRef } from 'react';
import type { Message } from '@/features/inbox/services/inbox.service';
import { VirtualList } from '@/features/inbox/components/virtual-list';
import { useMessageJump } from '@/features/inbox/hooks/use-message-jump';
import { conversationInsightsService as service } from '@/features/inbox/services/conversation-insights.service';
vi.mock('@/features/inbox/services/conversation-insights.service', () => ({ conversationInsightsService: { around: vi.fn() } }));
const msg = (id: string, conversationId = 'c1', createdAt = '2026-11-08T12:00:00Z') => ({ id, conversationId, createdAt, type: 'TEXT' }) as Message;
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it('salta para mensagem carregada sem pedir histórico e aplica realce', async () => {
  const el = document.createElement('div'); el.id = 'msg-m1'; el.scrollIntoView = vi.fn(); document.body.append(el);
  const scroll = vi.fn(); const scrollRef = { current: scroll }; const handle = createRef<ReturnType<typeof useMessageJump>['handle']>();
  const messages = [msg('m1')]; renderHook(() => useMessageJump('c1', messages, scrollRef, handle));
  await act(async () => { await handle.current!.jumpToMessage('m1'); });
  await waitFor(() => expect(scroll).toHaveBeenCalledWith(0)); expect(service.around).not.toHaveBeenCalled();
  await waitFor(() => expect(el.classList.contains('ring-2')).toBe(true)); el.remove();
});
it('carrega around autenticado, mantém mensagens recentes e ordena cronologicamente', async () => {
  vi.mocked(service.around).mockResolvedValue({ items: [msg('antiga', 'c1', '2020-01-01T12:00:00Z')] });
  const recent = [msg('recente')]; const scroll = { current: vi.fn() };
  const { result } = renderHook(() => useMessageJump('c1', recent, scroll));
  await act(async () => { await result.current.handle.jumpToMessage('antiga'); });
  expect(service.around).toHaveBeenCalledWith('c1', 'antiga', expect.anything()); expect(result.current.messages.map(m => m.id)).toEqual(['antiga', 'recente']);
});
it('recusa resposta de outra conversa e propaga falha de acesso', async () => {
  vi.mocked(service.around).mockResolvedValueOnce({ items: [msg('m2', 'c2')] }).mockRejectedValueOnce(new Error('Sem acesso'));
  const recent = [msg('recente')]; const { result } = renderHook(() => useMessageJump('c1', recent, { current: vi.fn() }));
  await act(async () => { await expect(result.current.handle.jumpToMessage('m2')).rejects.toThrow('Mensagem indisponível'); });
  expect(result.current.messages).toEqual(recent);
  await act(async () => { await expect(result.current.handle.jumpToMessage('m2')).rejects.toThrow('Sem acesso'); });
});
it('troca de conversa descarta histórico e impede resposta tardia', async () => {
  let resolve!: (value: { items: Message[] }) => void;
  vi.mocked(service.around).mockReturnValue(new Promise(r => { resolve = r; }));
  const recent = [msg('recente')]; const { result, rerender } = renderHook(({ id }) => useMessageJump(id, recent, { current: vi.fn() }), { initialProps: { id: 'c1' } });
  let pending!: Promise<void>; act(() => { pending = result.current.handle.jumpToMessage('antiga'); });
  rerender({ id: 'c2' });
  await act(async () => { resolve({ items: [msg('antiga')] }); await expect(pending).rejects.toThrow('Conversa alterada'); });
  expect(result.current.messages.map(m => m.id)).toEqual(['recente']);
});
it('não volta para o resultado antigo quando chega mensagem nova', async () => {
  const scroll = { current: vi.fn() }; const initial = [msg('m1')];
  const { result, rerender } = renderHook(({ messages }) => useMessageJump('c1', messages, scroll), { initialProps: { messages: initial } });
  await act(async () => { await result.current.handle.jumpToMessage('m1'); });
  expect(scroll.current).toHaveBeenCalledTimes(1);
  rerender({ messages: [...initial, msg('nova', 'c1', '2026-11-08T12:01:00Z')] });
  expect(scroll.current).toHaveBeenCalledTimes(1);
});

it('carrega e realça a mensagem antiga na VirtualList real com 300 mensagens', async () => {
  const recent = Array.from({ length: 300 }, (_, n) => msg(`m${n}`, 'c1', `2026-11-08T12:${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}Z`));
  vi.mocked(service.around).mockResolvedValue({ items: [msg('antiga', 'c1', '2020-01-01T12:00:00Z')] });
  const handle = createRef<ReturnType<typeof useMessageJump>['handle']>();
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  function Timeline() {
    const viewport = useRef<HTMLDivElement>(null); const scroll = useRef<((index: number) => void) | null>(null);
    const { messages } = useMessageJump('c1', recent, scroll, handle);
    return <div ref={viewport}><VirtualList initialAnchor="end" items={messages} itemKey={m => m.id} scrollRef={viewport} scrollToIndexRef={scroll} estimate={100} renderItem={m => <div id={`msg-${m.id}`}>{m.id}</div>} /></div>;
  }
  try {
    render(<Timeline />); expect(screen.queryByText('antiga')).not.toBeInTheDocument();
    await act(async () => { await handle.current!.jumpToMessage('antiga'); });
    await waitFor(() => expect(screen.getByText('antiga')).toHaveClass('ring-2'));
    expect(document.querySelectorAll('[data-virtual-key]').length).toBeLessThan(25);
  } finally { HTMLElement.prototype.scrollIntoView = original; }
});
