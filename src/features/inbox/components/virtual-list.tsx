'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type CSSProperties } from 'react';

interface Props<T> {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  scrollRef: RefObject<HTMLDivElement | null>;
  estimate: number;
  gap?: number;
  initialAnchor?: 'start' | 'end';
  scrollToIndexRef?: RefObject<((index: number) => void) | null>;
}

/** Variable-height window: measured rows, stable keys and spacers preserve the scroll range. */
export function VirtualList<T>({ items, itemKey, renderItem, scrollRef, estimate, scrollToIndexRef, gap = 0, initialAnchor = 'start' }: Props<T>) {
  const [playingKeys, setPlayingKeys] = useState<string[]>([]);
  const sizes = useRef(new Map<string, number>());
  const [revision, setRevision] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 800, bottomInset: 0, atEnd: initialAnchor === 'end' });
  const host = useRef<HTMLDivElement>(null);
  const offsets = useMemo(() => {
    const result = [0];
    for (const item of items) result.push(result[result.length - 1] + (sizes.current.get(itemKey(item)) ?? estimate));
    return result;
  }, [items, itemKey, estimate, revision]);
  const total = offsets[items.length];
  const top = viewport.atEnd ? Math.max(0, total - viewport.height + viewport.bottomInset) : viewport.top;
  useEffect(() => {
    const parent = scrollRef.current;
    if (!parent) return;
    const update = () => setViewport({
      top: Math.max(0, -(host.current?.getBoundingClientRect().top ?? 0) + parent.getBoundingClientRect().top),
      height: parent.clientHeight || 800,
      bottomInset: parent.scrollHeight - (host.current?.offsetHeight ?? 0) - ((host.current?.getBoundingClientRect().top ?? 0) - parent.getBoundingClientRect().top + parent.scrollTop),
      atEnd: initialAnchor === 'end' && parent.scrollHeight - parent.clientHeight - parent.scrollTop < 2,
    });
    if (initialAnchor === 'end') parent.scrollTop = parent.scrollHeight;
    update();
    parent.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(parent);
    return () => { parent.removeEventListener('scroll', update); observer?.disconnect(); };
  }, [scrollRef, initialAnchor]);
  useLayoutEffect(() => {
    if (!scrollToIndexRef) return;
    scrollToIndexRef.current = (index) => {
      const parent = scrollRef.current;
      if (!parent) return;
      const hostOffset = (host.current?.getBoundingClientRect().top ?? 0) - parent.getBoundingClientRect().top + parent.scrollTop;
      parent.scrollTop = hostOffset + (offsets[index] ?? 0);
      setViewport({ top: offsets[index] ?? 0, height: parent.clientHeight || 800, bottomInset: 0, atEnd: false });
    };
    return () => { scrollToIndexRef.current = null; };
  }, [offsets, scrollRef, scrollToIndexRef]);
  const measure = useCallback((key: string, height: number) => {
    if (!height || sizes.current.get(key) === height) return;
    sizes.current.set(key, height);
    setRevision((value) => value + 1);
  }, []);
  const virtual = items.length > 60;
  let start = 0;
  let end = items.length;
  if (virtual) {
    while (start < items.length && offsets[start + 1] < top - 500) start++;
    end = start;
    while (end < items.length && offsets[end] < top + viewport.height + 500) end++;
  }
  const anchor = useRef<{ key: string; offset: number; top: number } | null>(null);
  useLayoutEffect(() => {
    // Conversation lists keep their existing top-aligned behavior.
    if (initialAnchor !== 'end') return;
    const parent = scrollRef.current;
    if (!parent) return;
    const hostOffset = (host.current?.getBoundingClientRect().top ?? 0) - parent.getBoundingClientRect().top + parent.scrollTop;
    if (viewport.atEnd) {
      parent.scrollTop = parent.scrollHeight;
    } else if (anchor.current && anchor.current.top === viewport.top) {
      const index = items.findIndex((item) => itemKey(item) === anchor.current?.key);
      if (index >= 0) parent.scrollTop = hostOffset + offsets[index] + anchor.current.offset;
    }
    let index = 0;
    const currentTop = Math.max(0, parent.scrollTop - hostOffset);
    while (index < items.length - 1 && offsets[index + 1] <= currentTop) index++;
    anchor.current = items[index] ? { key: itemKey(items[index]), offset: currentTop - offsets[index], top: viewport.top } : null;
  }, [items, itemKey, offsets, scrollRef, viewport, initialAnchor]);
  const indexes = new Set(Array.from({ length: end - start }, (_, offset) => start + offset));
  items.forEach((item, index) => { if (playingKeys.includes(itemKey(item))) indexes.add(index); });
  return <div ref={host} style={{ position: 'relative' }} onPlayCapture={(event) => {
    const key = (event.target as HTMLElement).closest<HTMLElement>('[data-virtual-key]')?.dataset.virtualKey;
    if (key) setPlayingKeys((keys) => keys.includes(key) ? keys : [...keys, key]);
  }} onPauseCapture={(event) => {
    const key = (event.target as HTMLElement).closest<HTMLElement>('[data-virtual-key]')?.dataset.virtualKey;
    setPlayingKeys((keys) => keys.filter((entry) => entry !== key));
  }}>
    {virtual && <div aria-hidden style={{ height: offsets[start] }} />}
    {[...indexes].sort((a, b) => a - b).map((index) => {
      const item = items[index];
      const pinned = index < start || index >= end;
      return <MeasuredRow gap={gap} key={itemKey(item)} rowKey={itemKey(item)} onMeasure={measure} style={pinned ? { position: 'absolute', top: offsets[index], width: '100%' } : undefined}>{renderItem(item, index)}</MeasuredRow>;
    })}
    {virtual && <div aria-hidden style={{ height: offsets[items.length] - offsets[end] }} />}
  </div>;
}

function MeasuredRow({ rowKey, children, onMeasure, gap, style }: { style?: CSSProperties; gap: number; rowKey: string; children: ReactNode; onMeasure: (key: string, height: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    onMeasure(rowKey, element.getBoundingClientRect().height);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => onMeasure(rowKey, element.getBoundingClientRect().height));
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [rowKey, onMeasure]);
  return <div ref={ref} data-virtual-key={rowKey} style={{ ...style, paddingBottom: gap || undefined }}>{children}</div>;
}
