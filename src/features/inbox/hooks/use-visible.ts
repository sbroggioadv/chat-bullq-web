'use client';
import { useCallback, useState } from 'react';

/** Resolve media only near the viewport, keeping the placeholder dimensions. */
export function useVisible() {
  const [visible, setVisible] = useState(false);
  // A callback ref also observes nodes mounted after the initial render.
  const ref = useCallback((element: HTMLDivElement | null) => {
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
