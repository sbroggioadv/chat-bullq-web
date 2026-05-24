import { useCallback, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface TriggerState {
  open: boolean;
  query: string;
  triggerIndex: number;
}

const EMPTY: TriggerState = { open: false, query: '', triggerIndex: -1 };

export function useQuickReplyTrigger(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  text: string,
) {
  const [state, setState] = useState<TriggerState>(EMPTY);
  const suppressRef = useRef<boolean>(false);

  const recompute = useCallback(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      setState(EMPTY);
      return;
    }
    const el = textareaRef.current;
    if (!el) return setState(EMPTY);
    const cursor = el.selectionStart ?? text.length;
    let i = cursor - 1;
    while (i >= 0 && !/\s/.test(text[i]) && text[i] !== '/') i--;
    if (i < 0 || text[i] !== '/') return setState(EMPTY);
    const before = i === 0 ? '' : text[i - 1];
    if (before && !/\s/.test(before)) return setState(EMPTY);
    const query = text.slice(i + 1, cursor);
    if (/\s/.test(query)) return setState(EMPTY);
    setState({ open: true, query, triggerIndex: i });
  }, [text, textareaRef]);

  const replace = useCallback(
    (content: string, onChange: (next: string, cursor: number) => void) => {
      const el = textareaRef.current;
      if (!el || state.triggerIndex < 0) return;
      const cursor = el.selectionStart ?? text.length;
      const next =
        text.slice(0, state.triggerIndex) + content + text.slice(cursor);
      const newCursor = state.triggerIndex + content.length;
      suppressRef.current = true;
      setState(EMPTY);
      onChange(next, newCursor);
    },
    [state.triggerIndex, text, textareaRef],
  );

  const close = useCallback(() => {
    suppressRef.current = true;
    setState(EMPTY);
  }, []);

  return useMemo(
    () => ({ ...state, recompute, replace, close }),
    [state, recompute, replace, close],
  );
}
