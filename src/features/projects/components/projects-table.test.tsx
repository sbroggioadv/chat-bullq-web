import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ProjectsTable } from '@/features/projects/components/projects-table';

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: async () => [{ user: { id: 'u1', name: 'Responsável de teste', isActive: true } }] } }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: mocks }));
vi.mock('@/features/projects/components/project-detail', () => ({ ProjectDetail: ({ projectId, embedded }: { projectId: string; embedded?: boolean }) => <div>Detalhe {projectId} {embedded ? 'integrado' : 'isolado'}</div> }));
const rows = [{ id: 'p1', name: 'Projeto Um', description: 'Contrato', status: 'TODO', tasks: [{ done: true }, { done: false }] }, { id: 'p2', name: 'Projeto Dois', description: 'Documentos', status: 'IN_PROGRESS', tasks: [] }];
function mount() {
  mocks.list.mockResolvedValue(rows);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProjectsTable /></QueryClientProvider>);
}
describe('Lista de projetos compacta', () => {
  it('mantém lista e detalhe juntos, seleção e sequência da fase sem simular tarefas ou tags', async () => {
    mount();
    const list = await screen.findByRole('complementary', { name: 'Lista de projetos' });
    await screen.findByText('Detalhe p1 integrado');
    expect(within(list).getByRole('group', { name: 'Fase de Projeto Um: A fazer' })).toBeVisible();
    expect(within(list).getByRole('group', { name: 'Fase de Projeto Dois: Em execução' })).toBeVisible();
    const phases = within(list).getByRole('group', { name: 'Fase de Projeto Dois: Em execução' });
    expect(within(phases).getByRole('img', { name: 'A fazer: concluída' })).toHaveClass('bg-[var(--bq-ok)]');
    expect(within(phases).getByRole('img', { name: 'Paralisado: pendente' })).toBeVisible();
    expect(within(list).queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.click(within(list).getByRole('button', { name: /Projeto Dois/ }));
    expect(screen.getByText('Detalhe p2 integrado')).toBeVisible();
    expect(list).not.toHaveClass('hidden');
  });
  it('Todas e painel secundário preservam filtros de fase, responsável e busca por descrição', async () => {
    mount();
    await userEvent.click(within(screen.getByRole('group', { name: 'Filtros de projetos' })).getByRole('button', { name: 'Em execução' }));
    expect(within(screen.getByRole('group', { name: 'Filtros de projetos' })).getByRole('button', { name: 'Em execução' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar e filtrar' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ status: 'IN_PROGRESS', responsibleUserId: undefined }));
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por responsável'), 'u1');
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ status: 'IN_PROGRESS', responsibleUserId: 'u1' }));
    await userEvent.type(screen.getByLabelText('Buscar projetos'), 'Documentos');
    expect(screen.queryByRole('button', { name: /Projeto Um/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Projeto Dois/ })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Todas', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Todas', exact: true }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ status: undefined, responsibleUserId: undefined }));
    expect(screen.getByRole('button', { name: /Projeto Um/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Todas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
  it('criação mantém payload, seleciona novo projeto e limpa filtro', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Buscar e filtrar' }));
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por fase'), 'IN_PROGRESS');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Novo projeto' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo projeto' });
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Projeto Novo');
    await userEvent.type(within(dialog).getByLabelText('Descrição'), 'Escopo');
    await userEvent.selectOptions(within(dialog).getByLabelText('Fase'), 'WAITING_DOCS');
    mocks.create.mockResolvedValue({ id: 'new' });
    mocks.list.mockResolvedValue([...rows, { id: 'new', name: 'Projeto Novo', tasks: [] }]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar', exact: true }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: 'Projeto Novo', description: 'Escopo', status: 'WAITING_DOCS' }));
    expect(await screen.findByText('Detalhe new integrado')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Todas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
});
