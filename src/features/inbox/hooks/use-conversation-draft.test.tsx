import { StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useConversationDraft } from './use-conversation-draft';

describe('sessão do rascunho', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); localStorage.setItem('access_token', 'token'); });
  afterEach(() => vi.useRealTimers());
  it('preserva o trecho inteiro quando a sessão expira imediatamente após digitar', () => {
    const first = renderHook(() => useConversationDraft('exp-org', 'exp-user', 'exp-conv'));
    act(() => first.result.current.setText('trecho salvo mais recente'));
    localStorage.removeItem('access_token');
    first.unmount();
    localStorage.setItem('access_token', 'novo-token');
    const second = renderHook(() => useConversationDraft('exp-org', 'exp-user', 'exp-conv'));
    expect(second.result.current.text).toBe('trecho salvo mais recente');
    second.unmount();
  });
  it('isola usuários na mesma conversa', () => {
    const first = renderHook(() => useConversationDraft('users-org', 'user-a', 'users-conv'));
    act(() => first.result.current.setText('privado'));
    first.unmount();
    const second = renderHook(() => useConversationDraft('users-org', 'user-b', 'users-conv'));
    expect(second.result.current.text).toBe('');
    second.unmount();
  });
  it('mantém o texto digitado antes da chegada da identidade', () => {
    const { result, rerender } = renderHook(({ user }) => useConversationDraft('late-org', user, 'late-conv'), { initialProps: { user: null as string | null } });
    act(() => result.current.setText('digitado antes'));
    rerender({ user: 'late-user' });
    expect(result.current.text).toBe('digitado antes');
    expect(JSON.parse(localStorage.getItem('bullq:draft:v1:late-org:late-user:late-conv')!).text).toBe('digitado antes');
  });
  it('grava na identidade antiga e restaura na nova', () => {
    const { result, rerender, unmount } = renderHook(({ org, id }) => useConversationDraft(org, 'u', id), { initialProps: { org: 'o', id: 'a' } });
    act(() => result.current.setText('primeiro'));
    rerender({ org: 'o', id: 'b' });
    expect(result.current.text).toBe('');
    act(() => result.current.setText('segundo'));
    rerender({ org: 'o', id: 'a' });
    expect(result.current.text).toBe('primeiro');
    unmount();
    expect(JSON.parse(localStorage.getItem('bullq:draft:v1:o:u:b')!).text).toBe('segundo');
  });
  it('preserva edição durante envio e não ressuscita texto enviado', () => {
    const { result, unmount } = renderHook(() => useConversationDraft('o', 'u', 'a'));
    act(() => result.current.setText('  original  '));
    const sent = result.current.capture();
    act(() => result.current.setText('novo'));
    act(() => result.current.sent(sent));
    expect(result.current.text).toBe('novo');
    const next = result.current.capture();
    act(() => result.current.sent(next));
    act(() => vi.runAllTimers());
    unmount();
    expect(localStorage.getItem('bullq:draft:v1:o:u:a')).toBeNull();
  });
  it('descarta só envio confirmado após desmontagem e preserva outra edição igual', () => {
    const first = renderHook(() => useConversationDraft('o', 'u', 'a'));
    act(() => first.result.current.setText(' igual '));
    const sent = first.result.current.capture();
    first.unmount();
    const second = renderHook(() => useConversationDraft('o', 'u', 'a'));
    act(() => second.result.current.setText('outro'));
    act(() => second.result.current.setText(' igual '));
    act(() => first.result.current.sent(sent));
    expect(second.result.current.text).toBe(' igual ');
    second.unmount();
    expect(JSON.parse(localStorage.getItem('bullq:draft:v1:o:u:a')!).text).toBe(' igual ');
  });
  it('não regrava depois da remoção do token', () => {
    const { result, unmount } = renderHook(() => useConversationDraft('o', 'u', 'a'));
    act(() => result.current.setText('texto'));
    localStorage.removeItem('bullq:draft:v1:o:u:a');
    localStorage.removeItem('access_token');
    act(() => vi.runAllTimers());
    unmount();
    expect(localStorage.getItem('bullq:draft:v1:o:u:a')).toBeNull();
  });

  it('restaura sem apagar no Strict Mode e mantém o rascunho no pagehide', () => {
    localStorage.setItem('bullq:draft:v1:o:u:a', JSON.stringify({ text: 'guardado', savedAt: Date.now() }));
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result, unmount } = renderHook(() => useConversationDraft('o', 'u', 'a'), { wrapper });
    expect(result.current.text).toBe('guardado');
    act(() => result.current.setText('novo'));
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(JSON.parse(localStorage.getItem('bullq:draft:v1:o:u:a')!).text).toBe('novo');
    unmount();
  });

});
