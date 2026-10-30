import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/api';
import { ProjectDetail } from '@/features/projects/components/project-detail';

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
const mocks = vi.hoisted(() => ({ push: vi.fn(), getById: vi.fn(), update: vi.fn(), addTask: vi.fn(), updateTask: vi.fn(), removeTask: vi.fn(), addContact: vi.fn(), removeContact: vi.fn(), removeAttachment: vi.fn(), emailParticipants: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: async () => [] } }));
vi.mock('@/features/contacts/services/contacts.service', () => ({ contactsService: { list: vi.fn(async () => ({ contacts: [{ id: 'contact-new', name: 'Contato encontrado' }] })) } }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: mocks }));
const project = { id: 'project', name: 'Projeto de teste', description: 'Escopo original', status: 'TODO', exists: true, conversationIds: ['conv'], contacts: [{ id: 'link', name: 'Contato de teste', contactId: 'contact' }], attachments: [{ id: 'attachment', label: 'Arquivo de teste', url: 'https://example.invalid/file' }], tasks: [{ id: 'task', title: 'Tarefa de teste', done: false }] };
function mount(onBack?: () => void, result: unknown = project) {
  if (result instanceof Error) mocks.getById.mockRejectedValue(result);
  else mocks.getById.mockResolvedValue(result);
  mocks.update.mockResolvedValue(project);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProjectDetail projectId="project" onBack={onBack} /></QueryClientProvider>);
}
describe('Projeto repaginado', () => {
  it('mostra fases concluídas com check e mantém Paralisado pendente após Concluído', async () => {
    mount(undefined, { ...project, status: 'DONE' });
    const group = await screen.findByRole('group', { name: 'Fase atual do projeto' });
    expect(within(group).getByRole('button', { name: 'A fazer: concluída' }).querySelector('svg')).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Paralisado: pendente' }).querySelector('svg')).not.toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Concluído: atual' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('preserva edição do escopo e troca de fase sem gerar workflow fictício', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar escopo e dados' }));
    const name = await screen.findByLabelText('Nome');
    await waitFor(() => expect(name).toHaveValue('Projeto de teste'));
    const scope = screen.getByLabelText('Escopo do projeto');
    await userEvent.clear(scope);
    await userEvent.type(scope, 'Escopo revisado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar escopo e dados' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('project', expect.objectContaining({ description: 'Escopo revisado' })));
    await userEvent.click(within(screen.getByRole('group', { name: 'Fase atual do projeto' })).getByRole('button', { name: 'Em execução: pendente' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('project', { status: 'IN_PROGRESS' }));
    expect(screen.getByText('O fluxo deste projeto ainda não está disponível.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir conversa' })).toHaveAttribute('href', '/inbox?conversationId=conv');
  });
  it('preserva tarefas', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver tarefas' }));
    await screen.findByText('Tarefa de teste');
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledWith('project', 'task', { done: true }));
    await userEvent.type(screen.getByPlaceholderText('Nova tarefa'), 'Nova tarefa de teste');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(mocks.addTask).toHaveBeenCalledWith('project', 'Nova tarefa de teste'));
    await userEvent.click(screen.getByRole('button', { name: 'Remover tarefa' }));
    expect(mocks.removeTask).toHaveBeenCalledWith('project', 'task');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar janela' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('preserva envolvidos e documentos', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Incluir contato' }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Contato encontrado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ligar contato' }));
    await waitFor(() => expect(mocks.addContact).toHaveBeenCalledWith('project', 'contact-new'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Remover envolvido' }));
    expect(mocks.removeContact).toHaveBeenCalledWith('project', 'link');
    expect(screen.getByRole('link', { name: 'Arquivo de teste' })).toHaveAttribute('href', 'https://example.invalid/file');
    await userEvent.click(screen.getByRole('button', { name: 'Remover anexo' }));
    expect(mocks.removeAttachment).toHaveBeenCalledWith('project', 'attachment');
    expect(screen.queryByRole('button', { name: 'Mais ações do projeto' })).not.toBeInTheDocument();
  });
  it('preserva envio de e-mail', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'E-mail do projeto' }));
    await userEvent.type(screen.getByPlaceholderText('Assunto'), 'Assunto de teste');
    await userEvent.type(screen.getByPlaceholderText('Corpo do e-mail'), 'Mensagem de teste');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar e-mail' }));
    await waitFor(() => expect(mocks.emailParticipants).toHaveBeenCalledWith('project', { subject: 'Assunto de teste', body: 'Mensagem de teste', to: undefined }));
  });
});

describe('Carregamento e retorno do dossiê', () => {
  it('separa falha transitória de ausência e permite tentar novamente', async () => {
    mount(undefined, new Error('offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o projeto');
    expect(screen.queryByText('Projeto não encontrado.')).not.toBeInTheDocument();
    mocks.getById.mockResolvedValue(project);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Projeto de teste')).toBeVisible();
  });
  it.each([new ApiClientError('ausente', 404), { ...project, exists: false }])('reserva não encontrado para ausência real', async result => {
    mount(undefined, result);
    expect(await screen.findByText('Projeto não encontrado.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('retorna pelo callback da lista móvel', async () => {
    const back = vi.fn(); mount(back);
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(back).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it('mantém navegação da rota independente', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(mocks.push).toHaveBeenCalledWith('/projects');
  });
});


describe('Hierarquia do dossiê', () => {
  it('avança usando a sequência existente, sem criar status, e calcula progresso pelas tarefas', async () => {
    mount(undefined, { ...project, tasks: [{ id: 't1', done: true }, { id: 't2', done: false }] });
    expect(await screen.findByRole('progressbar', { name: 'Progresso das tarefas' })).toHaveAttribute('value', '1');
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Avançar fase' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('project', { status: 'WAITING_DOCS' }));
  });
  it('não inventa progresso sem tarefas nem avança além da última fase', async () => {
    mount(undefined, { ...project, status: 'DONE', tasks: [] });
    expect(await screen.findByRole('button', { name: 'Avançar fase' })).toBeDisabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anexar', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Incluir grupo' })).toBeDisabled();
    expect(screen.getByText('Progresso indisponível · sem tarefas')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

 it('preserva abrir página e voltar nas ações de edição, sem menu extra no cabeçalho', async () => {
    const back = vi.fn(); mount(back);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar escopo e dados' }));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir página do projeto' }));
    expect(mocks.push).toHaveBeenCalledWith('/projects/project');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar aos projetos' }));
    expect(back).toHaveBeenCalledOnce();
 });


it('mantém contato e envio de e-mail após tarefas', async () => {
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Ver tarefas' }));
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Tarefa de teste' }));
  await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledWith('project', 'task', { done: true }));
  await userEvent.click(screen.getByRole('button', { name: 'Fechar janela' }));
  await userEvent.click(screen.getByRole('button', { name: 'Incluir contato' }));
  await userEvent.click(await screen.findByRole('radio', { name: 'Contato encontrado' }));
  await userEvent.click(screen.getByRole('button', { name: 'Ligar contato' }));
  await waitFor(() => expect(mocks.addContact).toHaveBeenCalledWith('project', 'contact-new'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'E-mail do projeto' }));
  await userEvent.type(screen.getByPlaceholderText('Assunto'), 'Teste');
  await userEvent.type(screen.getByPlaceholderText('Corpo do e-mail'), 'Mensagem');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar e-mail' }));
  await waitFor(() => expect(mocks.emailParticipants).toHaveBeenCalledWith('project', { subject: 'Teste', body: 'Mensagem', to: undefined }));
});
