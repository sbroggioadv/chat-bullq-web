import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, it, expect, beforeEach } from 'vitest';
import { ConversationContextMenu } from './conversation-context-menu';
import type { Conversation } from '@/features/inbox/services/inbox.service';

const mocks = vi.hoisted(() => ({ pin: vi.fn(), error: vi.fn() }));
vi.mock('@/features/inbox/services/preferences.service', () => ({ preferencesService: { pin: mocks.pin } }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/settings/services/tags.service', () => ({ tagsService: { list: async () => [] } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
const row = { id: 'c1', contact: { tags: [] }, tags: [] } as unknown as Conversation;
function setup(pins: { id: string; pinnedAt: string }[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['user-preferences', 'org'], { inbox: { unreadOnly: true }, pinnedConversations: pins });
  render(<QueryClientProvider client={client}><ConversationContextMenu conversation={row} position={{ x: 0, y: 0 }} onClose={() => {}} /></QueryClientProvider>);
  return client;
}
beforeEach(() => { vi.clearAllMocks(); });
it('fixa e desafixa usando a lista devolvida, preservando os filtros', async () => {
  mocks.pin.mockResolvedValue([{ id: 'c1', pinnedAt: '2026-11-04' }]);
  const client = setup();
  fireEvent.click(screen.getByText('Fixar conversa'));
  await waitFor(() => expect(client.getQueryData(['user-preferences', 'org'])).toEqual({ inbox: { unreadOnly: true }, pinnedConversations: [{ id: 'c1', pinnedAt: '2026-11-04' }] }));
  expect(mocks.pin).toHaveBeenCalledWith('c1', true);
});
it('desafixa conversa persistida', async () => {
  mocks.pin.mockResolvedValue([]);
  const client = setup([{ id: 'c1', pinnedAt: '2026-11-04' }]);
  fireEvent.click(screen.getByText('Desafixar conversa'));
  await waitFor(() => expect(mocks.pin).toHaveBeenCalledWith('c1', false));
  await waitFor(() => expect(client.getQueryData(['user-preferences', 'org'])).toEqual({ inbox: { unreadOnly: true }, pinnedConversations: [] }));
});
it('mostra aviso quando o servidor recusa a 21ª fixação', async () => {
  mocks.pin.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'pin_limit_reached' } } });
  setup();
  fireEvent.click(screen.getByText('Fixar conversa'));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Você pode fixar até 20 conversas.'));
});
