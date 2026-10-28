'use client';
import { useEffect, useRef, useState } from 'react';

/** Resolve media only near the viewport, keeping the placeholder dimensions. */
export function useVisible() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}
