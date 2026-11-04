import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectPanel } from '@/features/inbox/components/project-panel';

const mocks = vi.hoisted(() => ({ get: vi.fn(), add: vi.fn(), update: vi.fn(), changeKind: vi.fn() }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: { getByConversation: mocks.get, addTask: mocks.add, updateTask: mocks.update, updateByConversation: mocks.changeKind, list: vi.fn(async () => []) } }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: vi.fn(async () => []) } }));
const project = { id: 'p1', exists: true, name: 'Dossiê de teste', tasks: [{ id: 't1', title: 'Conferir documentos', done: false }], attachments: [] };
function setup(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(project); mocks.add.mockResolvedValue(project); mocks.update.mockResolvedValue(project); });
it('compartilha a consulta entre Tasks e Projeto e mantém um único formulário de tarefa', async () => {
  const user = userEvent.setup();
  setup(<><ProjectPanel conversationId="c1" onClose={() => {}} mode="tasks" /><ProjectPanel conversationId="c1" onClose={() => {}} mode="profile" /></>);
  const field = await screen.findByRole('textbox', { name: 'Nova tarefa do projeto' });
  expect(screen.getAllByRole('textbox', { name: 'Nova tarefa do projeto' })).toHaveLength(1);
  expect(mocks.get).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('checkbox', { name: 'Conferir documentos' }));
  expect(mocks.update).toHaveBeenCalledWith('p1', 't1', { done: true });
  await user.type(field, 'Revisar contrato');
  await user.click(screen.getByRole('button', { name: 'Adicionar', exact: true }));
  expect(mocks.add).toHaveBeenCalledTimes(1);
  expect(mocks.add).toHaveBeenCalledWith('p1', 'Revisar contrato');
  expect(screen.getByRole('link', { name: 'Abrir dossiê completo' })).toBeInTheDocument();
});
it('não permite tarefa sem projeto e indica o vínculo necessário', async () => {
  mocks.get.mockResolvedValue({ exists: false });
  setup(<ProjectPanel conversationId="c1" onClose={() => {}} mode="tasks" />);
  expect(await screen.findByText('Vincule um projeto na seção Projeto para criar tarefas.')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Nova tarefa do projeto' })).not.toBeInTheDocument();
  expect(mocks.add).not.toHaveBeenCalled();
});

it('exibe e altera o tipo normalizado pelo registro de campos', async () => {
  const user = userEvent.setup();
  mocks.get.mockResolvedValue({ ...project, kind: 'MENTORSHIP', metadata: { kind: 'PROJECT' } });
  mocks.changeKind.mockResolvedValue({ ...project, kind: 'PROJECT' });
  setup(<ProjectPanel conversationId="c1" onClose={() => {}} mode="profile" />);
  const field = await screen.findByRole('combobox', { name: 'Tipo' });
  expect(field).toHaveValue('MENTORSHIP');
  await user.selectOptions(field, 'PROJECT');
  expect(mocks.changeKind).toHaveBeenCalledWith('c1', { metadata: { kind: 'PROJECT' } });
});
