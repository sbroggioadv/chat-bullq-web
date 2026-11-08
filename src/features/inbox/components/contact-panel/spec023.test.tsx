import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { MuteButton } from '@/features/inbox/components/contact-panel/mute-button';
import { NotesSection } from '@/features/inbox/components/contact-panel/notes-section';
import { NegotiationJourney } from '@/features/inbox/components/contact-panel/negotiation-journey';
import { SendChannelMenu } from '@/features/inbox/components/contact-panel/send-channel-menu';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Conversation } from '@/features/inbox/services/inbox.service';
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const conversation = { id: 'c1', organizationId: 'o1', channelId: 'wa' } as Conversation;
function mount(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{ui}</QueryClientProvider>);
}
beforeEach(() => { vi.resetAllMocks(); useAuthStore.setState({ activeOrgId: 'o1', user: { id: 'me', name: 'Eu', email: 'e@e', avatarUrl: null } }); });
afterEach(cleanup);
describe('F1 silêncio', () => {
  it('envia duração e mostra estado retornado', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { id: 'c1', mutedUntil: '9999-12-31T23:59:59Z' } } });
    mount(<MuteButton conversation={conversation} />);
    fireEvent.click(screen.getByRole('button', { name: /Silenciar/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sempre' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/conversations/c1/mute', { mode: 'forever' }));
    expect(await screen.findByText(/Silenciada sempre/)).toBeInTheDocument();
  });
  it('não permite mutação de outra organização', () => {
    mount(<MuteButton conversation={{ ...conversation, organizationId: 'other' }} />);
    expect(screen.getByRole('button', { name: /Silenciar/ })).toBeDisabled();
  });
  it('expõe erro do servidor', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Canal sem acesso'));
    mount(<MuteButton conversation={conversation} />);
    fireEvent.click(screen.getByRole('button', { name: /Silenciar/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '1 hora' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Canal sem acesso');
  });
});
describe('F4 notas', () => {
  it('vazio, valida conteúdo e cria nota interna sem enviar mensagem', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
    mount(<NotesSection conversationId="c1" />);
    expect(await screen.findByText('Nenhuma nota interna.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar nota' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: '  Ligar amanhã  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nota' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/conversations/c1/notes', { content: 'Ligar amanhã' }));
  });
  it('edita e apaga somente as próprias', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [
      { id: 'n1', content: 'Minha', authorId: 'me', authorName: 'Eu', createdAt: '2026-11-08T12:00:00Z' },
      { id: 'n2', content: 'Outra', authorId: 'other', authorName: 'Outro', createdAt: '2026-11-08T12:00:00Z' },
    ] } });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    mount(<NotesSection conversationId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nota' }));
    fireEvent.change(screen.getByLabelText('Editar nota interna'), { target: { value: 'Revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/conversations/c1/notes/n1', { content: 'Revisada' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/conversations/c1/notes/n1'));
  });
  it.each(['Acesso negado à organização', 'Canal sem acesso', 'Falha de rede'])('mostra %s sem dados', async message => {
    vi.mocked(api.get).mockRejectedValue(new Error(message));
    mount(<NotesSection conversationId="c1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
describe('F7 jornada', () => {
  it('mostra estágios ordenados, atual e valor real', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({ data: { data: url === '/pipelines' ? [{ id: 'p', stages: [{ id: 's2', name: 'Proposta', order: 2 }, { id: 's1', name: 'Contato', order: 1 }] }] : [{ id: 'card', pipelineId: 'p', pipeline: { name: 'Comercial' }, stageId: 's2', stage: { id: 's2', name: 'Proposta' }, value: '1500', currency: 'BRL' }] } }));
    mount(<NegotiationJourney conversation={conversation} />);
    expect(await screen.findByText(/1.500,00/)).toBeInTheDocument();
    expect(screen.getByText('Proposta').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Enviar contrato')).not.toBeInTheDocument();
  });
  it('vazio não inventa negociação', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    mount(<NegotiationJourney conversation={conversation} />);
    expect(await screen.findByText('Nenhuma negociação vinculada.')).toBeInTheDocument();
  });
});
describe('F8 canais', () => {
  it('lista disponíveis, bloqueia grupo e abre destino antes de navegar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [
      { channelId: 'wa', name: 'WhatsApp', current: true, available: true },
      { channelId: 'mail', name: 'E-mail', current: false, available: true },
      { channelId: 'group', name: 'Grupo', current: false, available: false, reason: 'Grupo não permite troca' },
    ] } });
    vi.mocked(api.post).mockResolvedValue({ data: { data: { conversationId: 'c2' } } });
    const navigate = vi.fn();
    mount(<SendChannelMenu conversationId="c1" onNavigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
    expect(await screen.findByRole('menuitem', { name: /Grupo/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: /E-mail/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('c2'));
    expect(api.post).toHaveBeenCalledWith('/conversations/c1/send-channels/mail/open');
  });
  it('exibe erro de acesso sem navegar', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Canal sem acesso'));
    mount(<SendChannelMenu conversationId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Canal sem acesso');
  });
});

it('F1 reativa notificações e considera silêncio expirado como desligado', async () => {
  vi.mocked(api.patch).mockResolvedValue({ data: { data: { id: 'c1', mutedUntil: null } } });
  mount(<MuteButton conversation={{ ...conversation, mutedUntil: '2020-01-01T00:00:00Z' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Silenciar conversa' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Reativar notificações' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/conversations/c1/mute', { mode: 'off' }));
});
it.each(['Acesso negado à organização', 'Canal sem acesso', 'Falha de rede'])('F7 expõe %s', async message => {
  vi.mocked(api.get).mockRejectedValue(new Error(message));
  mount(<NegotiationJourney conversation={conversation} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
});
it('F7 bloqueia outra organização sem consultar API', () => {
  mount(<NegotiationJourney conversation={{ ...conversation, organizationId: 'other' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('fora da organização');
  expect(api.get).not.toHaveBeenCalled();
});
it('F8 lista vazia e Escape fecha menu', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
  mount(<SendChannelMenu conversationId="c1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
  expect(await screen.findByText('Nenhum canal disponível.')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});
it('F8 falha na abertura preserva erro e não navega', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [{ channelId: 'wa2', name: 'WhatsApp 2', available: true }] } });
  vi.mocked(api.post).mockRejectedValue(new Error('Acesso negado ao canal'));
  const navigate = vi.fn();
  mount(<SendChannelMenu conversationId="c1" onNavigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'WhatsApp 2' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado');
  expect(navigate).not.toHaveBeenCalled();
});
it('F8 Gmail abre compositor existente com destinatário e canal corretos', async () => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: { data: url === '/conversations/c2' ? { id: 'c2', channelId: 'gmail', contact: { email: 'demonstracao@example.test' } } : [{ channelId: 'gmail', name: 'Gmail', type: 'GMAIL', available: true }] } }));
  vi.mocked(api.post).mockResolvedValue({ data: { data: { conversationId: 'c2' } } });
  const navigate = vi.fn();
  mount(<SendChannelMenu conversationId="c1" onNavigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Gmail' }));
  expect(await screen.findByLabelText('Para')).toHaveValue('demonstracao@example.test');
  expect(navigate).not.toHaveBeenCalled();
  expect(api.post).toHaveBeenCalledTimes(1);
});

it('F8 usa navegação SPA no caminho de produção e avisa antes de trocar com rascunho', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [{ channelId: 'wa2', name: 'WhatsApp 2', available: true }] } });
  vi.mocked(api.post).mockResolvedValue({ data: { data: { conversationId: 'c2' } } });
  mount(<SendChannelMenu conversationId="c1" draftText="Ainda não enviei" />);
  fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'WhatsApp 2' }));
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('O rascunho fica salvo nesta conversa');
  expect(api.post).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar nesta conversa' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'WhatsApp 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Trocar de canal' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/inbox?conversationId=c2'));
});
it('F8 caminho padrão navega sem aviso quando não há rascunho', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [{ channelId: 'wa2', name: 'WhatsApp 2', available: true }] } });
  vi.mocked(api.post).mockResolvedValue({ data: { data: { conversationId: 'c2' } } });
  mount(<SendChannelMenu conversationId="c1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Opções de envio' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'WhatsApp 2' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/inbox?conversationId=c2'));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
it('F8 move foco e navega por setas, Home, End e Escape', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [
    { channelId: 'wa', name: 'Atual', current: true, available: true },
    { channelId: 'a', name: 'Canal A', available: true },
    { channelId: 'blocked', name: 'Bloqueado', available: false },
    { channelId: 'b', name: 'Canal B', available: true },
  ] } });
  mount(<SendChannelMenu conversationId="c1" />);
  const trigger = screen.getByRole('button', { name: 'Opções de envio' });
  fireEvent.click(trigger);
  const first = await screen.findByRole('menuitem', { name: 'Canal A' });
  const last = screen.getByRole('menuitem', { name: 'Canal B' });
  await waitFor(() => expect(first).toHaveFocus());
  fireEvent.keyDown(first, { key: 'ArrowDown' }); expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'ArrowUp' }); expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'End' }); expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'Home' }); expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Escape' }); expect(trigger).toHaveFocus();
});

it('F4 troca de usuário não reaproveita notas nem rascunho do formulário', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 'n1', content: 'Nota da sessão anterior', authorId: 'me', authorName: 'Eu', createdAt: '2026-11-08T12:00:00Z' }] } });
  mount(<NotesSection conversationId="c1" />);
  expect(await screen.findByText('Nota da sessão anterior')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: 'Rascunho privado' } });
  vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
  act(() => useAuthStore.setState({ user: { id: 'other', name: 'Outro', email: 'o@e', avatarUrl: null } }));
  expect(screen.queryByText('Nota da sessão anterior')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Nova nota interna')).toHaveValue('');
});
it('F7 troca de usuário não reutiliza jornada ou funil em cache', async () => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: { data: url === '/pipelines' ? [{ id: 'p', stages: [{ id: 's', name: 'Etapa privada', order: 1 }] }] : [{ id: 'card', pipelineId: 'p', pipeline: { name: 'Negociação privada' }, stageId: 's', stage: { name: 'Etapa privada' } }] } }));
  mount(<NegotiationJourney conversation={conversation} />);
  expect(await screen.findByText('Negociação privada')).toBeInTheDocument();
  vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
  act(() => useAuthStore.setState({ user: { id: 'other', name: 'Outro', email: 'o@e', avatarUrl: null } }));
  expect(screen.queryByText('Negociação privada')).not.toBeInTheDocument();
  expect(screen.queryByText('Etapa privada')).not.toBeInTheDocument();
});
