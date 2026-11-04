import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, it, expect } from 'vitest';
import { ConversationHeader } from './conversation-header';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { toast } from 'sonner';

const mocks = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn() }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: { updateByConversation: mocks.update, removeByConversation: mocks.remove } }));
vi.mock('@/features/inbox/hooks/use-conversation-ai-allowed-in-group', () => ({ useConversationAiAllowedInGroup: () => ({ isPending: false }) }));
vi.mock('@/features/inbox/components/assignment-popover', () => ({ AssignmentPopover: () => null }));
vi.mock('@/features/inbox/components/pipeline-popover', () => ({ PipelinePopover: () => null }));
vi.mock('@/features/inbox/components/agent-pin-popover', () => ({ AgentPinPopover: () => null }));
vi.mock('@/features/inbox/components/conversation-ai-toggle', () => ({ ConversationAiToggle: () => null }));
vi.mock('@/components/ui/foundation', () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />, FoundationPopover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, Switch: () => null }));
const conversation = { id: 'c1', contact: { name: 'Conversa fictícia', phone: null, avatarUrl: null }, channel: { name: 'Canal', type: 'WHATSAPP' }, status: 'OPEN', isGroup: false } as Conversation;
function setup(row = conversation) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConversationHeader conversation={row} onUpdate={() => {}} /></QueryClientProvider>);
}
it('confirma nome e tipo e impede duas chamadas enquanto a primeira está pendente', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const deferred = Promise.withResolvers<unknown>();
  mocks.update.mockReset().mockReturnValue(deferred.promise);
  setup();
  const button = screen.getByRole('button', { name: 'Subir como mentoria' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(confirm).toHaveBeenCalledWith('Confirmar Conversa fictícia como mentoria?');
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledWith('c1', { name: 'Conversa fictícia', metadata: { kind: 'MENTORSHIP' } });
  expect(button).toBeDisabled();
  deferred.resolve({});
  await waitFor(() => expect(button).not.toBeDisabled());
  confirm.mockRestore();
});
it('confirma antes de tirar a conversa do projeto', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  mocks.remove.mockReset().mockResolvedValue(undefined);
  setup({ ...conversation, project: { exists: true } } as Conversation);
  fireEvent.click(screen.getByRole('button', { name: 'Tirar do projeto' }));
  expect(confirm).toHaveBeenCalledWith('Tirar Conversa fictícia do projeto?');
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('c1'));
  confirm.mockRestore();
});

it('troca somente o tipo do projeto existente e oferece apenas o outro tipo', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  mocks.update.mockReset().mockResolvedValue({});
  setup({ ...conversation, project: { exists: true, kind: 'PROJECT' } } as Conversation);
  fireEvent.click(screen.getByRole('button', { name: 'Trocar para mentoria' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('c1', { metadata: { kind: 'MENTORSHIP' } }));
  expect(screen.queryByRole('button', { name: 'Trocar para projeto' })).not.toBeInTheDocument();
  confirm.mockRestore();
});

it('oferece somente projeto quando já é mentoria', () => {
  setup({ ...conversation, project: { exists: true, kind: 'MENTORSHIP' } } as Conversation);
  expect(screen.getByRole('button', { name: 'Trocar para projeto' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Trocar para mentoria' })).not.toBeInTheDocument();
});

it('avisa sobre todos os números e informa a quantidade removida para grupo', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const success = vi.spyOn(toast, 'success');
  mocks.remove.mockReset().mockResolvedValue({ projectId: 'p1', removedConversations: 2 });
  setup({ ...conversation, isGroup: true, project: { exists: true, kind: 'PROJECT' } } as Conversation);
  fireEvent.click(screen.getByRole('button', { name: 'Tirar do projeto' }));
  expect(confirm).toHaveBeenCalledWith('Tirar o grupo Conversa fictícia do projeto? Ele sai do projeto em todos os seus números.');
  await waitFor(() => expect(success).toHaveBeenCalledWith('Grupo retirado do projeto (2 conversas).'));
  confirm.mockRestore(); success.mockRestore();
});

it('mantém o aviso individual ao remover uma conversa', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const success = vi.spyOn(toast, 'success');
  mocks.remove.mockReset().mockResolvedValue({ projectId: 'p1', removedConversations: 1 });
  setup({ ...conversation, project: { exists: true, kind: 'PROJECT' } } as Conversation);
  fireEvent.click(screen.getByRole('button', { name: 'Tirar do projeto' }));
  expect(confirm).toHaveBeenCalledWith('Tirar Conversa fictícia do projeto?');
  await waitFor(() => expect(success).toHaveBeenCalledWith('Conversa retirada do projeto'));
  confirm.mockRestore(); success.mockRestore();
});
