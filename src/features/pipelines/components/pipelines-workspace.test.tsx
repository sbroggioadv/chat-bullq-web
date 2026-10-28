import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PipelinesWorkspace } from '@/features/pipelines/components/pipelines-workspace';

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
const mocks = vi.hoisted(() => ({ push: vi.fn(), list: vi.fn(), getBoard: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/features/pipelines/services/pipelines.service', () => ({ pipelinesService: mocks }));
vi.mock('@/features/pipelines/components/kanban-board', () => ({ KanbanBoard: ({ pipelineId }: { pipelineId: string }) => <div>Quadro {pipelineId}</div> }));
const pipes = [{ id: 'p1', name: 'Comercial', isDefault: true, _count: { cards: 2 } }, { id: 'p2', name: 'Mentoria', isDefault: false, _count: { cards: 1 } }, { id: 'p3', name: 'Arquivo', archived: true }];
function mount() {
  mocks.list.mockResolvedValue(pipes);
  mocks.getBoard.mockResolvedValue({ pipeline: pipes[0], stages: [], cards: {} });
  mocks.create.mockResolvedValue({ id: 'new', name: 'Novo teste' });
  mocks.update.mockResolvedValue({}); mocks.remove.mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PipelinesWorkspace /></QueryClientProvider>);
}
describe('Controles de pipelines dentro da página', () => {
  it('abre padrão, troca pelos segmentos, oculta arquivados e abre etapas do quadro atual', async () => {
    mount();
    const segments = await screen.findByRole('group', { name: 'Pipeline' });
    await screen.findByText('Quadro p1');
    expect(within(segments).getByRole('button', { name: /Comercial/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(segments).queryByRole('button', { name: /Arquivo/ })).not.toBeInTheDocument();
    await userEvent.click(within(segments).getByRole('button', { name: 'Mentoria' }));
    expect(mocks.push).toHaveBeenCalledWith('/pipelines/p2');
    await userEvent.click(screen.getByRole('button', { name: 'Etapas' }));
    expect(screen.getByRole('dialog', { name: 'Configurar etapas' })).toBeInTheDocument();
  });
  it('Novo pipeline preserva create com nome e Enter, cancelamento e Escape', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Novo pipeline' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo pipeline' });
    await userEvent.type(within(dialog).getByPlaceholderText(/Nome do pipeline/), 'Novo teste{Enter}');
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: 'Novo teste' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Novo pipeline' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(within(dialog).queryByPlaceholderText(/Nome do pipeline/)).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('gestão secundária preserva listar, contagem, abrir, marcar padrão e exclusão confirmada', async () => {
    mount();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(screen.queryByRole('button', { name: 'Mais opções de pipelines' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Etapas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Todos / Gerenciar pipelines' }));
    const dialog = screen.getByRole('dialog', { name: 'Gerenciar pipelines' });
    expect(within(dialog).getByRole('link', { name: /Comercial/ })).toHaveAttribute('href', '/pipelines/p1');
    expect(within(dialog).getByText('0 etapas · 2 cards')).toBeVisible();
    await userEvent.click(within(dialog).getAllByTitle('Marcar como padrão')[0]);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('p2', { isDefault: true }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir pipeline Mentoria' }));
    expect(window.confirm).toHaveBeenCalledWith('Excluir o pipeline "Mentoria" e todos os cards?');
    expect(mocks.remove).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockReturnValue(true);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir pipeline Mentoria' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('p2'));
  });
});
