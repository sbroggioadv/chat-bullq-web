'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { readConversationDraft, writeConversationDraft } from '@/lib/conversation-drafts';

type Session = { orgId: string | null; userId: string | null; conversationId: string; text: string; revision: number; changed: boolean; mounted: boolean };
const revisions = new Map<string, number>();
const identity = (s: Pick<Session, 'orgId' | 'userId' | 'conversationId'>) => JSON.stringify([s.orgId, s.userId, s.conversationId]);

export function useConversationDraft(orgId: string | null, userId: string | null, conversationId: string) {
  const [text, setTextState] = useState('');
  const session = useRef<Session | null>(null);
  const [restoration, setRestoration] = useState(0);

  useLayoutEffect(() => {
    const previous = session.current;
    const carry = previous && previous.orgId === orgId && previous.conversationId === conversationId && !previous.userId && userId && previous.changed;
    const restored = carry ? previous.text : readConversationDraft(orgId, userId, conversationId);
    const current: Session = { orgId, userId, conversationId, text: restored, revision: revisions.get(JSON.stringify([orgId, userId, conversationId])) ?? 0, changed: !!carry, mounted: true };
    session.current = current;
    if (carry) {
      current.revision++;
      revisions.set(identity(current), current.revision);
      writeConversationDraft(orgId, userId, conversationId, current.text);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTextState(current.text);
    setRestoration(n => n + 1);
    return () => { current.mounted = false; };
  }, [orgId, userId, conversationId]);

  const setText = useCallback((value: string | ((previous: string) => string)) => {
    const current = session.current;
    if (!current) return;
    current.changed = true;
    current.text = typeof value === 'function' ? value(current.text) : value;
    current.revision = (revisions.get(identity(current)) ?? 0) + 1;
    revisions.set(identity(current), current.revision);
    setTextState(current.text);
    writeConversationDraft(current.orgId, current.userId, current.conversationId, current.text);
  }, []);
  const capture = useCallback(() => {
    const current = session.current!;
    return { current, text: current.text, revision: current.revision };
  }, []);
  const sent = useCallback((snapshot: ReturnType<typeof capture>) => {
    const { current, revision, text: sentText } = snapshot;
    if (current.revision !== revision || (revisions.get(identity(current)) ?? 0) !== revision) return false;
    if (!current.mounted && readConversationDraft(current.orgId, current.userId, current.conversationId) !== sentText) return false;
    current.text = '';
    if (current.mounted && session.current === current) setTextState('');
    writeConversationDraft(current.orgId, current.userId, current.conversationId, '');
    return true;
  }, []);
  return { text, setText, capture, sent, restoration };
}
