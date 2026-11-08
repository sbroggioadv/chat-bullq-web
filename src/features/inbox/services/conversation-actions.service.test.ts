import { beforeEach, it, expect, vi } from 'vitest';
import { api } from '@/lib/api';
import { conversationActionsService as actions } from '@/features/inbox/services/conversation-actions.service';
import { messageIncorporationKind } from '@/features/inbox/services/clickup-inbox.service';
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it.each(['', '   ', 'x'.repeat(4001)])('recusa nota inválida antes do transporte', async content => {
  await expect(actions.createNote('c', content)).rejects.toThrow('entre 1 e 4.000');
  expect(api.post).not.toHaveBeenCalled();
});
it('codifica os identificadores e aceita limite exato', async () => {
  vi.mocked(api.patch).mockResolvedValue({ data: { data: { id: 'n' } } });
  await actions.updateNote('c/a', 'n/b', 'x'.repeat(4000));
  expect(api.patch).toHaveBeenCalledWith('/conversations/c%2Fa/notes/n%2Fb', { content: 'x'.repeat(4000) });
});
it('não navega para destino vazio', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
  await expect(actions.openChannel('c', 'mail')).rejects.toThrow('destino');
});
it.each([403, 404, 500])('propaga falha HTTP %s sem inventar dados', async status => {
  const err = Object.assign(new Error('Acesso negado'), { status });
  vi.mocked(api.get).mockRejectedValue(err);
  await expect(actions.notes('c')).rejects.toBe(err);
  await expect(actions.sendChannels('c')).rejects.toBe(err);
});
it('F9 distingue texto, arquivo, vazio e revogada', () => {
  expect(messageIncorporationKind({ type: 'TEXT', content: { text: 'Oi' } })).toBe('comment');
  expect(messageIncorporationKind({ type: 'DOCUMENT', content: { url: '/f' } })).toBe('attachment');
  expect(messageIncorporationKind({ type: 'LOCATION', content: {} })).toBeNull();
  expect(messageIncorporationKind({ type: 'TEXT', content: { text: 'Oi' }, revokedAt: '2026-01-01' })).toBeNull();
});
