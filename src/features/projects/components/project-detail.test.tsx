import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ProjectDetail } from '@/features/projects/components/project-detail';

const mocks = vi.hoisted(() => ({ getById: vi.fn(), update: vi.fn(), addTask: vi.fn(), updateTask: vi.fn(), removeTask: vi.fn(), addContact: vi.fn(), removeContact: vi.fn(), removeAttachment: vi.fn(), emailParticipants: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: async () => [] } }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: mocks }));
const project = { id: 'project', name: 'Projeto de teste', description: 'Escopo original', status: 'TODO', exists: true, conversationIds: ['conv'], contacts: [{ id: 'link', name: 'Contato de teste', contactId: 'contact' }], attachments: [{ id: 'attachment', label: 'Arquivo de teste', url: 'https://example.invalid/file' }], tasks: [{ id: 'task', title: 'Tarefa de teste', done: false }] };
function mount() {
  mocks.getById.mockResolvedValue(project);
  mocks.update.mockResolvedValue(project);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProjectDetail projectId="project" /></QueryClientProvider>);
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
