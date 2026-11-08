import { beforeEach, expect, it, vi } from 'vitest';
import { conversationInsightsService as service } from '@/features/inbox/services/conversation-insights.service';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: mocks }));
beforeEach(() => vi.resetAllMocks());
it('usa rotas autenticadas e paginação do contrato, escapando IDs', async () => {
  mocks.get.mockResolvedValue({ data: { data: { items: [], nextCursor: null } } });
  await service.search('c/1', 'reunião', 'm2'); expect(mocks.get).toHaveBeenLastCalledWith('/conversations/c%2F1/messages/search', { params: { q: 'reunião', limit: 50, before: 'm2' }, signal: undefined });
  await service.attachments('c1', 'document'); expect(mocks.get).toHaveBeenLastCalledWith('/conversations/c1/attachments', { params: { kind: 'document', limit: 50, before: undefined }, signal: undefined });
  await service.around('c1', 'm/1'); expect(mocks.get).toHaveBeenLastCalledWith('/conversations/c1/messages/around/m%2F1', { params: { limit: 40 }, signal: undefined });
});
it('não consulta entrada inválida', async () => {
  await expect(service.search('c1', 'a')).rejects.toThrow('dois caracteres');
  await expect(service.summary('')).rejects.toThrow('Conversa inválida'); expect(mocks.get).not.toHaveBeenCalled();
});
it('lê null sem geração e envia force somente no POST', async () => {
  mocks.get.mockResolvedValue({ data: { data: null } }); await expect(service.summary('c1')).resolves.toBeNull(); expect(mocks.post).not.toHaveBeenCalled();
  mocks.post.mockResolvedValue({ data: { data: { text: 'Resumo' } } }); await service.generateSummary('c1', true); expect(mocks.post).toHaveBeenCalledWith('/conversations/c1/summary', { force: true });
});
for (const code of [403, 404, 429, 500]) it(`propaga erro ${code} sem inventar dado nem repetir geração`, async () => {
  const error = new Error(`HTTP ${code}`); mocks.get.mockRejectedValue(error); mocks.post.mockRejectedValue(error);
  await expect(service.meetings('c1')).rejects.toBe(error); await expect(service.generateSummary('c1')).rejects.toBe(error); expect(mocks.post).toHaveBeenCalledTimes(1);
});
it('resolve mídia pela rota existente e recusa URL executável', async () => {
  mocks.get.mockResolvedValueOnce({ data: { data: { url: 'https://example.com/file' } } });
  await expect(service.resolveMedia('m1')).resolves.toEqual({ url: 'https://example.com/file' }); expect(mocks.get).toHaveBeenCalledWith('/messages/m1/media');
  mocks.get.mockResolvedValueOnce({ data: { data: { url: 'javascript:alert(1)' } } }); await expect(service.resolveMedia('m1')).rejects.toThrow('Endereço de mídia inválido');
});
it('baixa o blob sem repassar credenciais da API ao provedor e preserva o nome', async () => {
  vi.useFakeTimers();
  mocks.get.mockResolvedValue({ data: { data: { url: 'https://example.com/file' } } });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['arquivo']) });
  vi.stubGlobal('fetch', fetchMock); const create = vi.fn().mockReturnValue('blob:fixture'); const revoke = vi.fn();
  const originalCreate = URL.createObjectURL; const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = create; URL.revokeObjectURL = revoke;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('proposta.pdf'); expect(this.href).toBe('blob:fixture');
  });
  try { await service.download('m1', 'proposta.pdf'); expect(fetchMock).toHaveBeenCalledWith('https://example.com/file'); expect(create).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce(); vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith('blob:fixture'); }
  finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; click.mockRestore(); vi.unstubAllGlobals(); vi.useRealTimers(); }
});
it('falha de download não dispara clique nem esconde erro', async () => {
  mocks.get.mockResolvedValue({ data: { data: { url: 'https://example.com/file' } } }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  try { await expect(service.download('m1', 'arquivo')).rejects.toThrow('Não foi possível baixar'); } finally { vi.unstubAllGlobals(); }
});

it.each(['https://mmg.whatsapp.net/file.enc?x=1', 'https://example.com/file.enc'])('recusa mídia criptografada devolvida pelo resolvedor: %s', async url => {
  mocks.get.mockResolvedValue({ data: { data: { url } } });
  await expect(service.resolveMedia('m1')).rejects.toThrow('Mídia ainda indisponível');
});
it('traduz falha de rede/CORS do download', async () => {
  mocks.get.mockResolvedValue({ data: { data: { url: 'https://example.com/file' } } });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  try { await expect(service.download('m1', 'arquivo')).rejects.toThrow('Não foi possível baixar o arquivo. Tente abrir pelo botão Abrir.'); }
  finally { vi.unstubAllGlobals(); }
});
