import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';

const mocks = vi.hoisted(() => ({ getBoard: vi.fn(), createCard: vi.fn(), getConversations: vi.fn() }));
vi.mock('@/features/pipelines/services/pipelines.service', () => ({ pipelinesService: mocks }));
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: mocks }));
vi.mock('@/features/pipelines/components/card-dialog', () => ({ CardDialog: () => null }));
vi.mock('@/features/pipelines/components/negotiation-window', () => ({ NegotiationWindow: () => null }));

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getBoard.mockResolvedValue({
    stages: [
      { id: 'normal', name: 'Novo contato', type: 'NORMAL' },
      { id: 'won', name: 'Ganho', type: 'WON' },
      { id: 'lost', name: 'Perdido', type: 'LOST' },
    ],
    cards: { normal: [], won: [], lost: [] },
  });
  mocks.getConversations.mockResolvedValue({ conversations: [{ id: 'conversation', contact: { name: 'Contato de teste' }, channel: { name: 'Canal de teste' } }] });
  mocks.createCard.mockResolvedValue({ id: 'new-card' });
});

describe('Inclusão de conversa por tipo de etapa', () => {
  it.each([['normal', 'Novo contato'], ['won', 'Ganho'], ['lost', 'Perdido']])('preserva o diálogo e a etapa de destino em %s', async (stageId, name) => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<QueryClientProvider client={client}><KanbanBoard pipelineId="pipeline" /></QueryClientProvider>);
    await screen.findByText(name);
    const column = container.querySelector(`[data-stage="${stageId}"]`)! as HTMLElement;
    if (stageId === 'normal') {
      const footer = within(column).getByRole('button', { name: 'Adicionar conversa', exact: true });
      expect(column.lastElementChild).toBe(footer);
      expect(within(column).queryByRole('button', { name: /Mais opções/ })).not.toBeInTheDocument();
      await user.click(footer);
    } else {
      expect(within(column).queryByRole('button', { name: 'Adicionar conversa', exact: true })).not.toBeInTheDocument();
      const menu = within(column).getByRole('button', { name: `Mais opções da etapa ${name}` });
      expect(column.firstElementChild).toContainElement(menu);
      await user.click(menu);
      await user.click(await screen.findByRole('menuitem', { name: 'Adicionar conversa' }));
    }
    const dialog = await screen.findByRole('dialog', { name: 'Adicionar conversa ao pipeline' });
    await user.click(await within(dialog).findByRole('button', { name: /Contato de teste/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar ao pipeline' }));
    await waitFor(() => expect(mocks.createCard).toHaveBeenCalledExactlyOnceWith('pipeline', {
      conversationId: 'conversation', stageId, value: undefined,
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
