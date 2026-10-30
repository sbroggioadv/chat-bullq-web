'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { readConversationDraft, writeConversationDraft } from '@/lib/conversation-drafts';

type Session = { orgId: string | null; conversationId: string; text: string; revision: number; timer: ReturnType<typeof setTimeout> | null; mounted: boolean };
const revisions = new Map<string, number>();
const identity = (s: Pick<Session, 'orgId' | 'conversationId'>) => JSON.stringify([s.orgId, s.conversationId]);
const cancel = (s: Session) => { if (s.timer) clearTimeout(s.timer); s.timer = null; };
const flush = (s: Session) => { cancel(s); writeConversationDraft(s.orgId, s.conversationId, s.text); };

export function useConversationDraft(orgId: string | null, conversationId: string) {
  const [text, setTextState] = useState('');
  const session = useRef<Session | null>(null);
  const [restoration, setRestoration] = useState(0);

  useLayoutEffect(() => {
    const current: Session = { orgId, conversationId, text: readConversationDraft(orgId, conversationId), revision: revisions.get(JSON.stringify([orgId, conversationId])) ?? 0, timer: null, mounted: true };
    session.current = current;
    // Restauração precisa ocorrer antes da pintura para não exibir a conversa anterior.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTextState(current.text);
    setRestoration(n => n + 1);
    const pagehide = () => flush(current);
    window.addEventListener('pagehide', pagehide);
    return () => { current.mounted = false; window.removeEventListener('pagehide', pagehide); flush(current); };
  }, [orgId, conversationId]);

  const setText = useCallback((value: string | ((previous: string) => string)) => {
    const current = session.current;
    if (!current) return;
    current.text = typeof value === 'function' ? value(current.text) : value;
    current.revision = (revisions.get(identity(current)) ?? 0) + 1;
    revisions.set(identity(current), current.revision);
    setTextState(current.text);
    cancel(current);
    current.timer = setTimeout(() => flush(current), 300);
  }, []);
  const capture = useCallback(() => {
    const current = session.current!;
    return { current, text: current.text, revision: current.revision };
  }, []);
  const sent = useCallback((snapshot: ReturnType<typeof capture>) => {
    const { current, revision, text: sentText } = snapshot;
    if (current.revision !== revision || (revisions.get(identity(current)) ?? 0) !== revision) return false;
    if (!current.mounted && readConversationDraft(current.orgId, current.conversationId) !== sentText) return false;
    cancel(current);
    current.text = '';
    if (current.mounted && session.current === current) setTextState('');
    writeConversationDraft(current.orgId, current.conversationId, '');
    return true;
  }, []);
  return { text, setText, capture, sent, restoration };
}
