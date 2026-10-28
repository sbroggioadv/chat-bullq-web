import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDialog } from '@/features/pipelines/components/card-dialog';
import type { CardSummary } from '@/features/pipelines/services/pipelines.service';

const mocks = vi.hoisted(() => ({ updateCard: vi.fn(), createCard: vi.fn(), removeCard: vi.fn(), error: vi.fn() }));
vi.mock('@/features/pipelines/services/pipelines.service', () => ({ pipelinesService: mocks }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.error } }));
const card: CardSummary = { id: 'card', organizationId: 'org', pipelineId: 'pipe', stageId: 'first', title: 'Negociação de teste', description: 'Escopo original', value: 0, currency: 'USD', status: 'LOST', order: 0, contactId: null, conversationId: null, assignedToId: null, metadata: {}, closedAt: null, closedReason: 'Motivo original', createdAt: '', updatedAt: '' };
function mount(value: CardSummary | null = card) {
  const onSaved = vi.fn(); const onClose = vi.fn();
  const props = { open: true, pipelineId: 'pipe', card: value, stageId: 'first', onSaved, onClose };
  return { ...render(<CardDialog {...props} />), props, onSaved, onClose };
}
beforeEach(() => { vi.clearAllMocks(); mocks.updateCard.mockResolvedValue(card); mocks.createCard.mockResolvedValue(card); mocks.removeCard.mockResolvedValue(undefined); });
describe('Editor de card na fundação L3', () => {
  it('salva os mesmos campos pelo updateCard, mantendo valor zero visível', async () => {
    const { onSaved } = mount();
    expect(screen.getByRole('dialog', { name: 'Editar card' })).toBeInTheDocument();
    expect(screen.getByLabelText('Valor (USD)')).toHaveValue('0');
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), '  Novo título  ');
    await userEvent.clear(screen.getByLabelText('Valor (USD)'));
    await userEvent.type(screen.getByLabelText('Valor (USD)'), '125,50');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.updateCard).toHaveBeenCalledExactlyOnceWith('card', { title: 'Novo título', description: 'Escopo original', value: 125.5, closedReason: 'Motivo original' });
    expect(mocks.createCard).not.toHaveBeenCalled();
  });
  it('cria pelo createCard com o pipeline e a etapa originais', async () => {
    const { onSaved } = mount(null);
    await userEvent.type(screen.getByLabelText('Título'), 'Novo card');
    await userEvent.click(screen.getByRole('button', { name: 'Criar', exact: true }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.createCard).toHaveBeenCalledExactlyOnceWith('pipe', { title: 'Novo card', description: undefined, value: undefined, stageId: 'first' });
    expect(mocks.updateCard).not.toHaveBeenCalled();
  });
  it('exclui somente após confirmar e usa removeCard com o mesmo ID', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { onSaved } = mount();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir', exact: true }));
    expect(mocks.removeCard).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir', exact: true }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledWith('Excluir card "Negociação de teste"?');
    expect(mocks.removeCard).toHaveBeenCalledExactlyOnceWith('card');
    confirm.mockRestore();
  });
  it('cancelar e Escape fecham sem gravar; reabrir descarta o rascunho', async () => {
    const { onClose, rerender, props } = mount();
    await userEvent.type(screen.getByLabelText('Título'), ' rascunho');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<CardDialog {...props} open={false} />);
    rerender(<CardDialog {...props} />);
    expect(screen.getByLabelText('Título')).toHaveValue(card.title);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(mocks.updateCard).not.toHaveBeenCalled();
    expect(mocks.createCard).not.toHaveBeenCalled();
    expect(mocks.removeCard).not.toHaveBeenCalled();
  });
  it('não grava título em branco e mantém o editor aberto quando o serviço falha', async () => {
    mocks.updateCard.mockRejectedValueOnce(new Error('Falha de teste'));
    const { onSaved } = mount();
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    expect(mocks.updateCard).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Título é obrigatório');
    await userEvent.type(screen.getByLabelText('Título'), 'Título');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha de teste'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled();
  });
});
