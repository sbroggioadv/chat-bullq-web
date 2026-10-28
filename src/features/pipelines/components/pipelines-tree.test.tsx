import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { PipelinesTree } from '@/features/pipelines/components/pipelines-tree';
const mocks = vi.hoisted(() => ({ push: vi.fn(), list: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/pipelines/active' }));
vi.mock('@/features/pipelines/services/pipelines.service', () => ({ pipelinesService: { list: mocks.list } }));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mocks.list.mockResolvedValue([
    { id: 'active', name: 'Comercial de teste', color: 'blue', isDefault: true, archived: false, _count: { cards: 2 } },
    { id: 'archived', name: 'Arquivado', archived: true },
  ]);
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PipelinesTree /></QueryClientProvider>);
}
it('mantém list, navegação, filtro de arquivados, contagem e seleção', async () => {
  mount();
  const pipeline = await screen.findByRole('button', { name: /Comercial de teste/ });
  expect(mocks.list).toHaveBeenCalledExactlyOnceWith();
  expect(pipeline).toHaveTextContent('2');
  expect(pipeline).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByText('Arquivado')).not.toBeInTheDocument();
  await userEvent.click(pipeline);
  expect(mocks.push).toHaveBeenLastCalledWith('/pipelines/active');
  for (const name of ['Todos', 'Novo pipeline', 'Pipelines']) {
    await userEvent.click(screen.getByRole('button', { name, exact: true }));
    expect(mocks.push).toHaveBeenLastCalledWith('/pipelines');
  }
});
it('mantém recolhimento persistido e reabre a lista sem mudar serviço', async () => {
  const { unmount } = mount();
  await screen.findByText('Comercial de teste');
  await userEvent.click(screen.getByRole('button', { name: 'Recolher', exact: true }));
  expect(localStorage.getItem('pipelines-tree-expanded')).toBe('0');
  expect(screen.queryByText('Comercial de teste')).not.toBeInTheDocument();
  unmount(); mount();
  expect(screen.getByRole('button', { name: 'Expandir', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Expandir', exact: true }));
  await waitFor(() => expect(screen.getByText('Comercial de teste')).toBeVisible());
  expect(localStorage.getItem('pipelines-tree-expanded')).toBe('1');
});
