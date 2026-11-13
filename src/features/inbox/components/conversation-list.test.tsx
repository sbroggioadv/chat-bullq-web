import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ConversationList } from '@/features/inbox/components/conversation-list';

const mocks = vi.hoisted(() => ({ list: vi.fn(), viewList: vi.fn(), views: vi.fn(), push: vi.fn(), replace: vi.fn(), userId: null as string | null, update: vi.fn(), on: vi.fn(() => () => {}), reconnect: vi.fn(() => () => {}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/stores/auth-store', () => ({ useAuthStore: (select: (state: { user: { id: string } | null }) => unknown) => select({ user: mocks.userId ? { id: mocks.userId } : null }) }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/inbox/hooks/use-socket', () => ({ useSocket: () => ({ on: mocks.on, onReconnect: mocks.reconnect, connected: true }) }));
vi.mock('@/features/inbox/hooks/use-inbox-preferences', () => ({ useInboxPreferences: () => ({ preferences: {}, isLoaded: true, update: mocks.update }) }));
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { getConversations: mocks.list } }));
vi.mock('@/features/inbox-views/services/inbox-views.service', () => ({ inboxViewsService: { list: () => mocks.views(), getConversations: mocks.viewList } }));
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
  mocks.views.mockResolvedValue([]);
  mocks.userId = null;
});

it('envia projectKind MENTORSHIP ao serviço de caixas salvas na aba Mentorias', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConversationList activeId={null} onSelect={() => {}} viewId="view-1" /></QueryClientProvider>);
  await waitFor(() => expect(mocks.viewList).toHaveBeenCalled());
  mocks.viewList.mockClear();

  fireEvent.click(screen.getByRole('button', { name: 'Mentorias' }));

  await waitFor(() => expect(mocks.viewList).toHaveBeenCalledWith(
    'view-1',
    expect.objectContaining({ projectKind: 'MENTORSHIP' }),
  ));
  expect(mocks.list).not.toHaveBeenCalled();
  client.clear();
});

it.each([undefined, 'view-1'])('filtra projetos e mentorias e mantém cache separado (view=%s)', async (viewId) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConversationList activeId={null} onSelect={() => {}} viewId={viewId} /></QueryClientProvider>);
  const list = viewId ? mocks.viewList : mocks.list;
  const params = () => list.mock.calls.at(-1)?.[viewId ? 1 : 0];
  await waitFor(() => expect(list).toHaveBeenCalled());
  expect(params()).not.toHaveProperty('projectKind');
  fireEvent.click(screen.getByRole('button', { name: 'Projetos' }));
  await waitFor(() => expect(params()).toMatchObject({ projectKind: 'PROJECT' }));
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

const responseView = { id: 'view-resp', organizationId: 'org', userId: 'user-1', name: 'Sem resposta', icon: null, color: null, filters: { lastDirection: 'inbound' as const }, order: 0, createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' };

function renderList(viewId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConversationList activeId={null} onSelect={() => {}} viewId={viewId} /></QueryClientProvider>);
  return client;
}

const chip = (name: string) => screen.getByRole('button', { name });

it('marca Não lidas e Minhas como pressionados só quando o filtro está ligado', async () => {
  mocks.userId = 'user-1';
  mocks.views.mockResolvedValue([responseView]);
  const client = renderList();
  await waitFor(() => expect(chip('Sem resposta')).toBeEnabled());

  expect(chip('Não lidas')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Minhas')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Sem resposta')).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(chip('Não lidas'));
  expect(chip('Não lidas')).toHaveAttribute('aria-pressed', 'true');
  expect(chip('Minhas')).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(chip('Minhas'));
  expect(chip('Minhas')).toHaveAttribute('aria-pressed', 'true');
  expect(chip('Sem resposta')).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(chip('Não lidas'));
  fireEvent.click(chip('Minhas'));
  expect(chip('Não lidas')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Minhas')).toHaveAttribute('aria-pressed', 'false');
  client.clear();
});

it('marca Sem resposta quando a caixa aberta é a de última mensagem recebida e volta para /inbox ao clicar de novo', async () => {
  mocks.views.mockResolvedValue([responseView]);
  const client = renderList('view-resp');
  await waitFor(() => expect(chip('Sem resposta')).toHaveAttribute('aria-pressed', 'true'));
  expect(chip('Sem resposta')).toHaveAttribute('title', 'Voltar para a caixa de entrada');
  expect(chip('Não lidas')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Minhas')).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(chip('Sem resposta'));
  expect(mocks.push).toHaveBeenCalledWith('/inbox');
  client.clear();
});

it.each([undefined, 'view-outra'])('não marca Sem resposta fora da caixa de última mensagem recebida (view=%s)', async (viewId) => {
  mocks.views.mockResolvedValue([responseView]);
  const client = renderList(viewId);
  await waitFor(() => expect(chip('Sem resposta')).toBeEnabled());
  expect(chip('Sem resposta')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Sem resposta')).toHaveAttribute('title', 'Abrir caixa de mensagens sem resposta');

  fireEvent.click(chip('Sem resposta'));
  expect(mocks.push).toHaveBeenCalledWith('/inbox?view=view-resp');
  client.clear();
});

it('deixa Sem resposta desligado e sem navegação quando não existe a caixa', async () => {
  const client = renderList();
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  expect(chip('Sem resposta')).toBeDisabled();
  expect(chip('Sem resposta')).toHaveAttribute('aria-pressed', 'false');
  expect(chip('Sem resposta')).toHaveAttribute('title', 'Configure uma caixa com última mensagem recebida');
  client.clear();
});
