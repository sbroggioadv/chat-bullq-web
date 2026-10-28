import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConversationDialog } from '@/features/inbox/components/conversation-dialog';
import { usePendingActions } from '@/features/inbox/pending-actions/use-pending-actions';

const fixture = vi.hoisted(() => ({
  connected: true,
  conversation: vi.fn().mockResolvedValue({ id: 'c' }),
  pending: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/inbox/hooks/use-socket', () => ({ useSocket: () => ({ connected: fixture.connected }) }));
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { getConversation: fixture.conversation } }));
vi.mock('@/features/inbox/pending-actions/api', () => ({ listPendingActions: fixture.pending }));
vi.mock('@/features/inbox/components/chat-panel', () => ({ ChatPanel: () => null }));
function Pending() { usePendingActions('c'); return null; }
beforeEach(() => { vi.useFakeTimers(); fixture.connected = true; vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it.each(['dialog', 'pending'] as const)('%s só consulta por intervalo durante disconnect', async (subject) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const query = subject === 'dialog' ? fixture.conversation : fixture.pending;
  const tree = (open = true) => <QueryClientProvider client={client}>
    {subject === 'dialog' ? <ConversationDialog conversationId="c" open={open} onClose={() => {}} /> : <Pending />}
  </QueryClientProvider>;
  const view = render(tree());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(query).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(query).toHaveBeenCalledTimes(1);
  fixture.connected = false;
  view.rerender(tree());
  await act(async () => { await vi.advanceTimersByTimeAsync(subject === 'dialog' ? 5001 : 10001); });
  expect(query).toHaveBeenCalledTimes(2);
  fixture.connected = true;
  view.rerender(tree());
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(query).toHaveBeenCalledTimes(2);
  if (subject === 'dialog') {
    fixture.connected = false;
    view.rerender(tree(false));
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(query).toHaveBeenCalledTimes(2);
  }
  view.unmount();
  client.clear();
});
