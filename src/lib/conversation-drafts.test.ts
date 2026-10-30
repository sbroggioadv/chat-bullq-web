import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearConversationDrafts, readConversationDraft, writeConversationDraft } from './conversation-drafts';

describe('rascunhos por conversa', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('access_token', 'token'); });
  it('isola conversas e organizações e remove texto vazio', () => {
    writeConversationDraft('org', 'a', ' texto ');
    expect(readConversationDraft('org', 'a')).toBe(' texto ');
    expect(readConversationDraft('org', 'b')).toBe('');
    expect(readConversationDraft('outra', 'a')).toBe('');
    writeConversationDraft('org', 'a', '');
    expect(readConversationDraft('org', 'a')).toBe('');
  });
  it('ignora dados expirados e não acessa rascunhos sem token', () => {
    localStorage.setItem('bullq:draft:v1:org:a', JSON.stringify({ text: 'antigo', savedAt: Date.now() - 8 * 86400000 }));
    expect(readConversationDraft('org', 'a')).toBe('');
    expect(localStorage.getItem('bullq:draft:v1:org:a')).toBeNull();
    localStorage.removeItem('access_token');
    writeConversationDraft('org', 'a', 'não salva');
    expect(localStorage.getItem('bullq:draft:v1:org:a')).toBeNull();
  });
  it('limpa somente rascunhos e trata exceções sem expor conteúdo', () => {
    writeConversationDraft('org', 'a', 'segredo');
    localStorage.setItem('outra', 'preservada');
    clearConversationDrafts();
    expect(localStorage.getItem('outra')).toBe('preservada');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('segredo'); });
    expect(readConversationDraft('org', 'a')).toBe('');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('segredo');
    get.mockRestore(); warn.mockRestore();
  });
});
