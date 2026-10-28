import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/api';
import { ProjectDetail } from '@/features/projects/components/project-detail';

const mocks = vi.hoisted(() => ({ push: vi.fn(), getById: vi.fn(), update: vi.fn(), addTask: vi.fn(), updateTask: vi.fn(), removeTask: vi.fn(), addContact: vi.fn(), removeContact: vi.fn(), removeAttachment: vi.fn(), emailParticipants: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: async () => [] } }));
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
    await userEvent.selectOptions(screen.getByLabelText('Fase atual do projeto'), 'IN_PROGRESS');
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('project', { status: 'IN_PROGRESS' }));
    expect(screen.getByText('O fluxo deste projeto ainda não está disponível.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir conversa' })).toHaveAttribute('href', '/inbox?conversationId=conv');
  });
  it('preserva tarefas, envolvidos, documentos e envio de e-mail', async () => {
    mount();
    await screen.findByText('Tarefa de teste');
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledWith('project', 'task', { done: true }));
    await userEvent.type(screen.getByPlaceholderText('Nova tarefa'), 'Nova tarefa de teste');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(mocks.addTask).toHaveBeenCalledWith('project', 'Nova tarefa de teste'));
    await userEvent.click(screen.getByRole('button', { name: 'Remover tarefa' }));
    expect(mocks.removeTask).toHaveBeenCalledWith('project', 'task');
    await userEvent.type(screen.getByPlaceholderText('ID do contato'), 'contact-new');
    await userEvent.click(screen.getByRole('button', { name: 'Ligar' }));
    await waitFor(() => expect(mocks.addContact).toHaveBeenCalledWith('project', 'contact-new'));
    await userEvent.click(screen.getByRole('button', { name: 'Remover envolvido' }));
    expect(mocks.removeContact).toHaveBeenCalledWith('project', 'link');
    expect(screen.getByRole('link', { name: 'Arquivo de teste' })).toHaveAttribute('href', 'https://example.invalid/file');
    await userEvent.click(screen.getByRole('button', { name: 'Remover anexo' }));
    expect(mocks.removeAttachment).toHaveBeenCalledWith('project', 'attachment');
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
