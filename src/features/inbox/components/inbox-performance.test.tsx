import type { ReactNode } from 'react';
import type { Message } from '@/features/inbox/services/inbox.service';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import InboxPage from '@/app/(dashboard)/inbox/page';
import { ChatPanel } from './chat-panel';
import { useAuthStore } from '@/stores/auth-store';

const fixture = vi.hoisted(() => ({
  listeners: new Map<string, Set<(...args: unknown[]) => void>>(),
  requests: [] as string[],
  confirmSend: null as null | ((value: unknown) => void),
  deferSend: false,
  conversation: { id: 'fixture-conversation', organizationId: 'fixture-org', channelId: 'ch', contactId: 'ct', assignedToId: null, status: 'OPEN', protocol: null, isGroup: false, aiAllowedInGroup: false, lastMessageAt: null, createdAt: '2026-10-27T12:00:00Z', contact: { id: 'ct', name: 'Contato fixture', phone: '000', avatarUrl: null }, channel: { id: 'ch', type: 'WHATSAPP_ZAPPFY', name: 'Fixture' }, assignedTo: null, messages: [], _count: { messages: 1 } },
  message: { id: 'fixture-message', conversationId: 'fixture-conversation', direction: 'INBOUND', type: 'TEXT', content: { text: 'Mensagem fixture' }, externalId: null, status: 'DELIVERED', senderName: null, senderId: null, sender: null, sentAt: null, deliveredAt: null, readAt: null, createdAt: '2026-10-27T12:00:00Z' },
}));
vi.mock('@/lib/socket', () => {
  const socket = { connected: true, on: (event: string, fn: (...args: unknown[]) => void) => { if (!fixture.listeners.has(event)) fixture.listeners.set(event, new Set()); fixture.listeners.get(event)!.add(fn); }, off: (event: string, fn: (...args: unknown[]) => void) => fixture.listeners.get(event)?.delete(fn), emit: vi.fn() };
  return { getSocket: () => socket };
});
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('view=fixture-view'), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: {
  get: async (url: string) => {
    fixture.requests.push(`GET ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const value = url.endsWith('/conversations') ? { conversations: [fixture.conversation], pagination: { page: 1, totalPages: 1, total: 1 } } : url === '/messages' ? { messages: [fixture.message], pagination: {} } : url.startsWith('/conversations/') ? fixture.conversation : url === '/users/me/preferences' ? {} : [];
    return { data: { data: value } };
  },
  post: async (url: string) => { fixture.requests.push(`POST ${url}`); if (fixture.deferSend && url === '/messages') return new Promise((resolve) => { fixture.confirmSend = resolve; }); return { data: { data: {} } }; },
} }));
vi.mock('./inbox-layout', () => ({ InboxLayout: ({ list, panel }: { list: ReactNode; panel: ReactNode }) => <>{list}{panel}</> }));
vi.mock('./conversation-header', () => ({ ConversationHeader: () => <div>Header fixture</div> }));
vi.mock('./chat-input', () => ({ ChatInput: ({ onSend }: { onSend: (text: string) => Promise<unknown> }) => <button onClick={() => { void onSend("Texto otimista fixture").catch(() => undefined); }}>Enviar fixture</button>, validateFile: vi.fn() }));
vi.mock('../pending-actions/pending-actions-list', () => ({ PendingActionsList: () => null }));
vi.mock('./agent-runs-sidebar', () => ({ AgentRunsSidebar: () => null }));
vi.mock('./contact-workspace-panel', () => ({ ContactWorkspacePanel: () => null }));

beforeEach(() => {
  fixture.requests.length = 0;
  useAuthStore.setState({ activeOrgId: 'fixture-org' });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('mede abertura e entrega duplicada em lista, página e chat reais (API fixture 20 ms)', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  render(<QueryClientProvider client={client}><InboxPage /></QueryClientProvider>);
  await screen.findByText('Contato fixture');
  await act(async () => { for (const fn of fixture.listeners.get('ready') ?? []) fn(); });
  await new Promise((resolve) => setTimeout(resolve, 50));
  fixture.requests.length = 0;
  const start = performance.now();
  fireEvent.click(screen.getByText('Contato fixture'));
  await screen.findByText('Mensagem fixture');
  const elapsed = performance.now() - start;
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const opening = [...fixture.requests];
  fixture.requests.length = 0;
  await act(async () => {
    const payload = { conversationId: fixture.conversation.id, message: { ...fixture.message, id: 'new-fixture', content: { text: 'Nova fixture' } } };
    for (let i = 0; i < 2; i++) for (const fn of fixture.listeners.get('message:new') ?? []) fn(payload);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  console.log(JSON.stringify({ scenario: 'fixture-20ms-jsdom', opening, arrival: fixture.requests, clickToDOM_ms: Number(elapsed.toFixed(2)) }));
  expect(opening).toEqual(['GET /messages', 'GET /conversations/fixture-conversation']);
  expect(fixture.requests).toEqual([]);
  expect(screen.getAllByText('Nova fixture')).toHaveLength(2); // preview and bubble
  expect(client.getQueryCache().find({ queryKey: ['conversation', fixture.conversation.id] })?.options).toMatchObject({ refetchInterval: false });
  client.clear();
});

it('mostra texto antes do POST confirmar e troca o id sem duplicar', async () => {
  fixture.deferSend = true;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><InboxPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText('Contato fixture'));
  await screen.findByText('Mensagem fixture');
  fireEvent.click(screen.getByText('Enviar fixture'));
  expect(await screen.findByText('Texto otimista fixture')).toBeInTheDocument();
  expect(fixture.confirmSend).not.toBeNull();
  expect(client.getQueryData<{ messages: Message[] }>(['messages', fixture.conversation.id])!.messages.some((m: Message) => m.id.startsWith('pending:'))).toBe(true);
  await act(async () => { fixture.confirmSend!({ data: { data: { ...fixture.message, id: 'confirmed-send', direction: 'OUTBOUND', content: { text: 'Texto otimista fixture' } } } }); });
  const messages = client.getQueryData<{ messages: Message[] }>(['messages', fixture.conversation.id])!.messages;
  expect(messages.some((m: Message) => m.id.startsWith('pending:'))).toBe(false);
  expect(messages.filter((m: Message) => m.id === 'confirmed-send')).toHaveLength(1);
  fixture.deferSend = false;
  client.clear();
});

it('mostra lacunas de Projetos e Mentorias sem listar uma amostra como resultado completo', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  render(<QueryClientProvider client={client}><InboxPage /></QueryClientProvider>);
  await screen.findByText('Contato fixture');
  await waitFor(() => expect(client.isFetching()).toBe(0));
  fixture.requests.length = 0;
  fireEvent.click(screen.getByRole('button', { name: 'Projetos', exact: true }));
  expect(await screen.findByText('Conversas por projeto: ainda não disponível.')).toBeTruthy();
  expect(screen.queryByText('Contato fixture')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Mentorias', exact: true }));
  expect(await screen.findByText('Conversas de mentorias: ainda não disponível.')).toBeTruthy();
  expect(fixture.requests.filter((request) => request.includes('/conversations'))).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Todas', exact: true }));
  expect(await screen.findByText('Contato fixture')).toBeTruthy();
  client.clear();
});


it('deixa o chat interativo a 800 px e só o torna inerte quando o detalhe cobre o chat a 390 px', async () => {
  document.documentElement.style.setProperty('--bq-breakpoint-phone', '560px');
  document.documentElement.style.setProperty('--bq-breakpoint-toolbar', '1120px');
  let width = 800;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width <= Number(query.match(/([0-9]+)px/)?.[1]), media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const renderChat = (open: boolean) => <QueryClientProvider client={client}><ChatPanel conversation={fixture.conversation} onConversationUpdate={vi.fn()} projectOpen={open} /></QueryClientProvider>;
  const view = render(renderChat(true));
  const chat = view.container.querySelector<HTMLElement>('.bq-chat-column')!;
  expect(chat.inert).toBe(false);
  const composer = screen.getByRole('button', { name: 'Enviar fixture' });
  composer.focus();
  expect(composer).toHaveFocus();
  view.rerender(renderChat(false));
  width = 390;
  view.rerender(renderChat(true));
  expect(chat.inert).toBe(true);
  view.rerender(renderChat(false));
  expect(chat.inert).toBe(false);
  client.clear();
  document.documentElement.style.removeProperty('--bq-breakpoint-phone');
  document.documentElement.style.removeProperty('--bq-breakpoint-toolbar');
});
