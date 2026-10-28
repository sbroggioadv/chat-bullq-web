import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useVisible } from '@/features/inbox/hooks/use-visible';

function DelayedNode({ mounted }: { mounted: boolean }) {
  const { ref, visible } = useVisible();
  return mounted ? <div ref={ref}>{visible ? 'visible' : 'hidden'}</div> : null;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('observa o nó que aparece após a primeira montagem e desconecta ao desmontar', () => {
  let intersect: IntersectionObserverCallback = () => {};
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  const view = render(<DelayedNode mounted={false} />);
  expect(observe).not.toHaveBeenCalled();
  view.rerender(<DelayedNode mounted />);
  expect(observe).toHaveBeenCalledWith(screen.getByText('hidden'));
  act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(screen.getByText('visible')).toBeInTheDocument();
  view.unmount();
  expect(disconnect).toHaveBeenCalled();
});
it('usa o fallback quando o nó aparece sem IntersectionObserver', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  const view = render(<DelayedNode mounted={false} />);
  view.rerender(<DelayedNode mounted />);
  await waitFor(() => expect(screen.getByText('visible')).toBeInTheDocument());
});
