import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { NegotiationWindow } from '@/features/pipelines/components/negotiation-window';
import type { CardSummary, PipelineStage } from '@/features/pipelines/services/pipelines.service';

const mocks = vi.hoisted(() => ({ getConversation: vi.fn(), moveCard: vi.fn() }));
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { getConversation: mocks.getConversation } }));
vi.mock('@/features/pipelines/services/pipelines.service', () => ({ pipelinesService: { moveCard: mocks.moveCard } }));
vi.mock('@/features/inbox/components/chat-panel', () => ({ ChatPanel: ({ conversation }: { conversation: { id: string } }) => <div>Chat {conversation.id}</div> }));
const card: CardSummary = { id: 'card', organizationId: 'org', pipelineId: 'pipe', stageId: 'first', title: 'Negociação de teste', description: null, value: null, currency: 'BRL', status: 'OPEN', order: 0, contactId: null, conversationId: 'conv', assignedToId: null, metadata: {}, closedAt: null, closedReason: null, createdAt: '', updatedAt: '' };
const stages: PipelineStage[] = ['first', 'won'].map((id, order) => ({ id, pipelineId: 'pipe', name: id, color: null, type: id === 'won' ? 'WON' : 'NORMAL', order, createdAt: '' }));
function mount() {
  const close = vi.fn(); const edit = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><NegotiationWindow card={card} cards={{ won: [card, card] }} stages={stages} onClose={close} onEdit={edit} /></QueryClientProvider>);
  return { close, edit };
}
describe('Negociação no pipeline', () => {
  it('abre o chat vinculado e apresenta lacunas sem inventar marcos nem valor', async () => {
    mocks.getConversation.mockResolvedValue({ id: 'conv' });
    mount();
    expect(await screen.findByText('Chat conv')).toBeVisible();
    expect(screen.getByText('Ainda não informado')).toBeVisible();
    expect(screen.getByText(/Diagnóstico, proposta, contrato e reunião: acompanhamento ainda não disponível/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir em Conversas' })).toHaveAttribute('href', '/inbox?conversationId=conv');
  });
  it('troca a etapa pela API e mantém acesso à edição e ao fechamento', async () => {
    mocks.getConversation.mockResolvedValue({ id: 'conv' });
    mocks.moveCard.mockResolvedValue({});
    const { close, edit } = mount();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Etapa da negociação' }), 'won');
    await waitFor(() => expect(mocks.moveCard).toHaveBeenCalledWith('card', 'won', 2));
    await userEvent.click(screen.getByRole('button', { name: 'Editar valor e dados' }));
    expect(edit).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('mostra erro de carregamento sem substituir a conversa por exemplo', async () => {
    mocks.getConversation.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a conversa');
    expect(screen.queryByText('Chat conv')).not.toBeInTheDocument();
  });
});
