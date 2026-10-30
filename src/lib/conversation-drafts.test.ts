import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearConversationDrafts, readConversationDraft, writeConversationDraft } from './conversation-drafts';

describe('rascunhos por conversa', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('access_token', 'token'); });
  it('isola conversas e organizações e remove texto vazio', () => {
    writeConversationDraft('org', 'u', 'a', ' texto ');
    expect(readConversationDraft('org', 'u', 'a')).toBe(' texto ');
    expect(readConversationDraft('org', 'u', 'b')).toBe('');
    expect(readConversationDraft('outra', 'u', 'a')).toBe('');
    writeConversationDraft('org', 'u', 'a', '');
    expect(readConversationDraft('org', 'u', 'a')).toBe('');
  });
  it('isola usuários e não acessa rascunhos sem usuário', () => {
    writeConversationDraft('org', 'alice', 'conversa', 'texto alice');
    writeConversationDraft('org', 'bob', 'conversa', 'texto bob');
    expect(readConversationDraft('org', 'alice', 'conversa')).toBe('texto alice');
    expect(readConversationDraft('org', 'bob', 'conversa')).toBe('texto bob');
    writeConversationDraft('org', null, 'conversa', 'não persistir');
    expect(readConversationDraft('org', null, 'conversa')).toBe('');
    expect(localStorage.getItem('bullq:draft:v1:org:null:conversa')).toBeNull();
  });
  it('ignora dados expirados e não acessa rascunhos sem token', () => {
    localStorage.setItem('bullq:draft:v1:org:u:a', JSON.stringify({ text: 'antigo', savedAt: Date.now() - 8 * 86400000 }));
    expect(readConversationDraft('org', 'u', 'a')).toBe('');
    expect(localStorage.getItem('bullq:draft:v1:org:u:a')).toBeNull();
    localStorage.removeItem('access_token');
    writeConversationDraft('org', 'u', 'a', 'não salva');
    expect(localStorage.getItem('bullq:draft:v1:org:u:a')).toBeNull();
  });
  it('limpa somente rascunhos e trata exceções sem expor conteúdo', () => {
    writeConversationDraft('org', 'u', 'a', 'segredo');
    localStorage.setItem('outra', 'preservada');
    clearConversationDrafts();
    expect(localStorage.getItem('outra')).toBe('preservada');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('segredo'); });
    expect(readConversationDraft('org', 'u', 'a')).toBe('');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('segredo');
    get.mockRestore(); warn.mockRestore();
  });
});
