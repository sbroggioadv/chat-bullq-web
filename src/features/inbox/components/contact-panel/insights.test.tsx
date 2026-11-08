import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ConversationSearch } from '@/features/inbox/components/contact-panel/conversation-search';
import { SummarySection } from '@/features/inbox/components/contact-panel/summary-section';
import { AttachmentsSection } from '@/features/inbox/components/contact-panel/attachments-section';
import { MeetingsHistory } from '@/features/inbox/components/contact-panel/meetings-history';
import { conversationInsightsService as service } from '@/features/inbox/services/conversation-insights.service';

vi.mock('@/features/inbox/services/conversation-insights.service', async importOriginal => ({ ...(await importOriginal<typeof import('@/features/inbox/services/conversation-insights.service')>()), conversationInsightsService: {
  search: vi.fn(), summary: vi.fn(), generateSummary: vi.fn(), attachments: vi.fn(), meetings: vi.fn(), resolveMedia: vi.fn(), download: vi.fn(),
} }));
function mount(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={client}>{children}</QueryClientProvider>), client };
}
const summary = { text: 'Contexto', sections: { assunto: 'Demonstração', situacao: 'Em análise', pendencias: 'Enviar proposta', proximoPasso: 'Retornar amanhã' }, generatedAt: '2026-11-08T12:00:00Z', messageCount: 12, stale: true };
const hit = { id: 'm1', createdAt: '2026-11-08T12:00:00Z', direction: 'INBOUND', type: 'TEXT', senderName: 'Pessoa de teste', snippet: 'Uma reunião amanhã', matchStart: 4, matchLength: 7 };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.summary).mockResolvedValue(null); vi.mocked(service.attachments).mockResolvedValue({ items: [], nextCursor: null }); vi.mocked(service.meetings).mockResolvedValue({ connected: true, items: [] }); });
afterEach(cleanup);

describe('F2 busca', () => {
  it('exige dois caracteres, destaca o trecho, pagina e salta com id', async () => {
    vi.mocked(service.search).mockResolvedValueOnce({ items: [hit], nextCursor: 'm1' }).mockResolvedValueOnce({ items: [{ ...hit, id: 'm2' }], nextCursor: null });
    const jump = vi.fn(); mount(<ConversationSearch conversationId="c1" onJumpToMessage={jump} />);
    const input = screen.getByRole('searchbox'); fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled(); expect(service.search).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'reuniao' } }); fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('reunião', { selector: 'mark' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Uma reunião amanhã/ })); await waitFor(() => expect(jump).toHaveBeenCalledWith('m1'));
    fireEvent.click(screen.getByRole('button', { name: 'Mais resultados' }));
    await waitFor(() => expect(service.search).toHaveBeenLastCalledWith('c1', 'reuniao', 'm1', expect.anything()));
  });
  it('mostra vazio e falha de salto', async () => {
    vi.mocked(service.search).mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValueOnce({ items: [hit], nextCursor: null });
    mount(<ConversationSearch conversationId="c1" onJumpToMessage={async () => { throw new Error('Mensagem indisponível'); }} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nada' } }); fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('Nenhuma mensagem encontrada.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'reuniao' } }); fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Uma reunião amanhã/ })); expect(await screen.findByRole('alert')).toHaveTextContent('Mensagem indisponível');
  });
});
describe('F3 resumo', () => {
  it('consulta sem gerar sozinho, gera só no clique e apresenta seções e stale', async () => {
    mount(<SummarySection conversationId="c1" />);
    expect(await screen.findByText('Nenhum resumo gerado.')).toBeInTheDocument(); expect(service.generateSummary).not.toHaveBeenCalled();
    vi.mocked(service.generateSummary).mockResolvedValue(summary); fireEvent.click(screen.getByRole('button', { name: 'Gerar resumo' }));
    expect(await screen.findByText('Retornar amanhã')).toBeInTheDocument(); expect(screen.getByText(/desatualizado/i)).toBeInTheDocument();
    expect(service.generateSummary).toHaveBeenCalledWith('c1', false);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar resumo' })); await waitFor(() => expect(service.generateSummary).toHaveBeenLastCalledWith('c1', true));
  });
  it('mostra falha do provedor e permite tentar novamente', async () => {
    vi.mocked(service.generateSummary).mockRejectedValue(new Error('Provedor indisponível'));
    mount(<SummarySection conversationId="c1" />); await screen.findByText('Nenhum resumo gerado.'); fireEvent.click(screen.getByRole('button', { name: 'Gerar resumo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Provedor indisponível'); expect(screen.queryByText('Retornar amanhã')).not.toBeInTheDocument();
  });
});
describe('F5 anexos', () => {
  it('mostra vazio e filtra pelo tipo', async () => {
    mount(<AttachmentsSection conversationId="c1" />); expect(await screen.findByText('Nenhum anexo encontrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tipo de anexo'), { target: { value: 'document' } });
    await waitFor(() => expect(service.attachments).toHaveBeenLastCalledWith('c1', 'document', undefined, expect.anything()));
  });
  it('resolve miniatura, abre e baixa pelo serviço autenticado', async () => {
    vi.mocked(service.attachments).mockResolvedValue({ items: [{ messageId: 'm1', kind: 'image', fileName: 'imagem.png', mimeType: 'image/png', sizeBytes: 128, createdAt: hit.createdAt, direction: 'INBOUND', senderName: null, mediaPath: '/messages/m1/media' }], nextCursor: null });
    vi.mocked(service.resolveMedia).mockResolvedValue({ url: 'https://example.com/image.png' });
    mount(<AttachmentsSection conversationId="c1" />);
    expect(await screen.findByAltText('imagem.png')).toHaveAttribute('src', 'https://example.com/image.png');
    expect(screen.getByRole('link', { name: 'Abrir imagem.png' })).toHaveAttribute('href', 'https://example.com/image.png');
    fireEvent.click(screen.getByRole('button', { name: 'Baixar imagem.png' })); await waitFor(() => expect(service.download).toHaveBeenCalledWith('m1', 'imagem.png'));
  });
});
describe('F6 reuniões', () => {
  it('mostra vazio, desconexão e histórico separado sem esconder dados', async () => {
    vi.mocked(service.meetings).mockResolvedValueOnce({ connected: true, items: [] });
    const view = mount(<MeetingsHistory conversationId="c1" />); expect(await screen.findByText('Nenhuma reunião vinculada.')).toBeInTheDocument(); view.unmount();
    vi.mocked(service.meetings).mockResolvedValue({ connected: false, items: [
      { eventId: 'e1', title: 'Demonstração futura', start: '2099-11-09T13:00:00Z', end: '2099-11-09T14:00:00Z', meetLink: 'https://meet.google.com/abc', attendees: ['teste@example.com'], status: 'confirmed', createdAt: hit.createdAt },
      { eventId: 'e2', title: 'Reunião anterior', start: '2020-01-01T13:00:00Z', end: '2020-01-01T14:00:00Z', meetLink: null, attendees: [], status: 'cancelled', createdAt: hit.createdAt },
    ] }); mount(<MeetingsHistory conversationId="c2" />);
    expect(await screen.findByText(/Google Agenda desconectado/)).toBeInTheDocument(); expect(screen.getByText('Próximas')).toBeInTheDocument(); expect(screen.getByText('Passadas')).toBeInTheDocument(); expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Entrar no Meet/ })).toHaveAttribute('href', 'https://meet.google.com/abc');
  });
});
for (const [name, Component, method] of [['resumo', SummarySection, 'summary'], ['anexos', AttachmentsSection, 'attachments'], ['reuniões', MeetingsHistory, 'meetings']] as const) {
  for (const status of [403, 404, 500]) it(`${name}: exibe erro ${status} e não vaza conteúdo de outra conversa`, async () => {
    vi.mocked(service[method]).mockRejectedValue(new Error(status === 403 ? 'Sem acesso ao canal desta organização' : `Falha ${status}`));
    mount(<Component conversationId="outra-conversa" />); expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ? 'Sem acesso' : `Falha ${status}`);
    expect(screen.queryByText('Demonstração')).not.toBeInTheDocument();
  });
}
for (const status of [403, 404, 500]) it(`busca: exibe erro ${status}`, async () => {
  vi.mocked(service.search).mockRejectedValue(new Error(`Falha ${status}`)); mount(<ConversationSearch conversationId="outro-canal" onJumpToMessage={vi.fn()} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'teste' } }); fireEvent.click(screen.getByRole('button', { name: 'Buscar' })); expect(await screen.findByRole('alert')).toHaveTextContent(`Falha ${status}`);
});
it('anexos: falha de miniatura não dispara repetição automática; download falha visivelmente', async () => {
  vi.mocked(service.attachments).mockResolvedValue({ items: [{ messageId: 'm1', kind: 'image', fileName: 'imagem.png', mimeType: 'image/png', sizeBytes: null, createdAt: hit.createdAt, direction: 'INBOUND', senderName: null, mediaPath: '/messages/m1/media' }], nextCursor: null });
  vi.mocked(service.resolveMedia).mockResolvedValue({ url: 'https://example.com/image.png' }); vi.mocked(service.download).mockRejectedValue(new Error('Download indisponível'));
  mount(<AttachmentsSection conversationId="c1" />); fireEvent.error(await screen.findByAltText('imagem.png'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível exibir a miniatura'); expect(service.resolveMedia).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Baixar imagem.png' }));
  await waitFor(() => expect(screen.getAllByRole('alert').some(el => el.textContent?.includes('Download indisponível'))).toBe(true));
});
it('anexos: paginação conserva arquivos anteriores', async () => {
  const file = { messageId: 'm1', kind: 'document' as const, fileName: null, mimeType: null, sizeBytes: null, createdAt: hit.createdAt, direction: 'INBOUND' as const, senderName: null, mediaPath: '/messages/m1/media' };
  vi.mocked(service.attachments).mockResolvedValueOnce({ items: [file], nextCursor: 'm1' }).mockResolvedValueOnce({ items: [{ ...file, messageId: 'm2', fileName: 'proposta.pdf' }], nextCursor: null });
  vi.mocked(service.resolveMedia).mockResolvedValue({ url: 'https://example.com/file' }); mount(<AttachmentsSection conversationId="c1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mais anexos' })); expect(await screen.findByText('proposta.pdf')).toBeInTheDocument(); expect(screen.getByText('Anexo')).toBeInTheDocument();
  expect(service.attachments).toHaveBeenLastCalledWith('c1', 'all', 'm1', expect.anything());
});
it('resumo: uma resposta tardia da conversa anterior não aparece na conversa atual', async () => {
  let finish!: (data: typeof summary) => void;
  vi.mocked(service.summary).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(null);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><SummarySection conversationId="c1" /></QueryClientProvider>);
  view.rerender(<QueryClientProvider client={client}><SummarySection conversationId="c2" /></QueryClientProvider>);
  await screen.findByText('Nenhum resumo gerado.'); finish(summary); await waitFor(() => expect(screen.queryByText('Retornar amanhã')).not.toBeInTheDocument());
});

it('reuniões: uma revogação de acesso esconde o resultado já armazenado em cache', async () => {
  vi.mocked(service.meetings).mockResolvedValueOnce({ connected: true, items: [{ eventId: 'e1', title: 'Conteúdo restrito', start: '2099-11-09T13:00:00Z', end: '2099-11-09T14:00:00Z', meetLink: null, attendees: [], status: 'confirmed', createdAt: hit.createdAt }] }).mockRejectedValue(new Error('Sem acesso ao canal'));
  const { client } = mount(<MeetingsHistory conversationId="c1" />);
  await screen.findByText('Conteúdo restrito'); await client.invalidateQueries({ queryKey: ['conversation-insights'] });
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem acesso ao canal'); expect(screen.queryByText('Conteúdo restrito')).not.toBeInTheDocument();
});
