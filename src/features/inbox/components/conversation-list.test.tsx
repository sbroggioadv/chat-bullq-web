import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ConversationList } from '@/features/inbox/components/conversation-list';

const mocks = vi.hoisted(() => ({ list: vi.fn(), viewList: vi.fn(), update: vi.fn(), on: vi.fn(() => () => {}), reconnect: vi.fn(() => () => {}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/inbox/hooks/use-socket', () => ({ useSocket: () => ({ on: mocks.on, onReconnect: mocks.reconnect, connected: true }) }));
vi.mock('@/features/inbox/hooks/use-inbox-preferences', () => ({ useInboxPreferences: () => ({ preferences: {}, isLoaded: true, update: mocks.update }) }));
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { getConversations: mocks.list } }));
vi.mock('@/features/inbox-views/services/inbox-views.service', () => ({ inboxViewsService: { list: async () => [], getConversations: mocks.viewList } }));
vi.mock('@/features/channels/services/channels.service', () => ({ channelsService: { list: async () => [] } }));
vi.mock('@/features/settings/services/tags.service', () => ({ tagsService: { list: async () => [] } }));
vi.mock('@/features/segments/services/segments.service', () => ({ segmentsService: { list: async () => [] } }));
vi.mock('@/features/inbox/services/preferences.service', () => ({ preferencesService: { get: async () => ({ pinnedConversations: [] }) } }));
vi.mock('@/features/ai-agents/services/jarvis-desk.service', () => ({ jarvisDeskService: { open: async () => new Promise(() => {}) } }));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollTo = vi.fn();
  const page = { conversations: [], pagination: { page: 1, totalPages: 1, hasMore: false, total: 0 } };
  mocks.list.mockResolvedValue(page);
  mocks.viewList.mockResolvedValue(page);
});

it.each([undefined, 'view-1'])('filtra projetos e mentorias e mantém cache separado (view=%s)', async (viewId) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConversationList activeId={null} onSelect={() => {}} viewId={viewId} /></QueryClientProvider>);
  const list = viewId ? mocks.viewList : mocks.list;
  const params = () => list.mock.calls.at(-1)?.[viewId ? 1 : 0];
  await waitFor(() => expect(list).toHaveBeenCalled());
  expect(params()).not.toHaveProperty('projectKind');
  fireEvent.click(screen.getByRole('button', { name: 'Projetos' }));
  await waitFor(() => expect(params()).toMatchObject({ projectKind: 'ANY' }));
  expect(params()).not.toHaveProperty('groups');
  expect(await screen.findByText('Nenhuma conversa com projeto. Vincule um projeto à conversa no cabeçalho.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Mentorias' }));
  await waitFor(() => expect(params()).toMatchObject({ projectKind: 'MENTORSHIP' }));
  expect(params()).not.toHaveProperty('groups');
  expect(await screen.findByText('Nenhuma conversa de mentoria. Marque o projeto da conversa como Mentoria no cabeçalho.')).toBeVisible();
  expect(screen.queryByText(/ainda não disponível/)).not.toBeInTheDocument();
  for (const tab of ['Todas', 'Pessoas', 'Grupos']) {
    fireEvent.click(screen.getByRole('button', { name: tab }));
    await waitFor(() => expect(screen.getByText('Nenhuma conversa encontrada')).toBeVisible());
    const queries = client.getQueryCache().findAll({ queryKey: ['conversations'] });
    const active = queries.find(query => query.getObserversCount() > 0 && !query.queryKey.includes('pinned'));
    expect(active?.queryKey).not.toContain('projects');
    expect(active?.queryKey).not.toContain('mentorships');
    // Cache hit is permitted; a fresh tab still uses its original unfiltered request.
    expect(params()).not.toHaveProperty('projectKind');
  }
  expect(client.getQueryCache().findAll({ queryKey: ['conversations'] }).filter(query => !query.queryKey.includes('pinned')).length).toBeGreaterThanOrEqual(5);
  client.clear();
});
