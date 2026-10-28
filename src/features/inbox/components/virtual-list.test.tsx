import { createRef, useLayoutEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { VirtualList } from '@/features/inbox/components/virtual-list';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('janela de 300 itens mantém poucos nós e permite alcançar o fim', () => {
  const scroll = createRef<HTMLDivElement>();
  const items = Array.from({ length: 300 }, (_, id) => ({ id: String(id) }));
  render(<div ref={scroll}><VirtualList items={items} itemKey={(item) => item.id} scrollRef={scroll} estimate={100} renderItem={(item) => <div data-testid="row">{item.id}</div>} /></div>);
  expect(screen.getAllByTestId('row').length).toBeLessThan(25);
  vi.spyOn(scroll.current!.firstElementChild!, 'getBoundingClientRect').mockImplementation(() => ({ top: -scroll.current!.scrollTop }) as DOMRect);
  fireEvent.scroll(scroll.current!, { target: { scrollTop: 29_000 } });
  expect(screen.getByText('299')).toBeInTheDocument();
  expect(screen.getAllByTestId('row').length).toBeLessThan(25);
});
it('preserva o elemento de áudio em reprodução ao sair da janela', () => {
  const scroll = createRef<HTMLDivElement>();
  const items = Array.from({ length: 300 }, (_, id) => ({ id: String(id) }));
  const { container } = render(<div ref={scroll}><VirtualList items={items} itemKey={(item) => item.id} scrollRef={scroll} estimate={100} renderItem={(item) => <audio data-testid={`audio-${item.id}`} />} /></div>);
  const audio = screen.getByTestId('audio-0');
  fireEvent.play(audio);
  vi.spyOn(scroll.current!.firstElementChild!, 'getBoundingClientRect').mockImplementation(() => ({ top: -scroll.current!.scrollTop }) as DOMRect);
  fireEvent.scroll(scroll.current!, { target: { scrollTop: 29_000 } });
  expect(screen.getByTestId('audio-0')).toBe(audio);
  expect(container.querySelectorAll('audio').length).toBeLessThan(25);
});

function mockGeometry(heights: Map<string, number> = new Map()) {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.closest('[data-testid="scroll"]')?.scrollHeight ?? 0; });
  const positions = new WeakMap<HTMLElement, number>();
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(function (this: HTMLElement) { return positions.get(this) ?? 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'set').mockImplementation(function (this: HTMLElement, top: number) { positions.set(this, Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight))); });
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    const host = this.querySelector('[data-virtual-key]')?.parentElement;
    return host ? [...host.children].reduce((height, child) => {
      const row = child as HTMLElement;
      return height + (row.dataset.virtualKey ? heights.get(row.dataset.virtualKey) ?? 100 : parseFloat(row.style.height) || 0);
    }, 0) : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const parent = this.closest('[data-testid="scroll"]') as HTMLElement | null;
    return { top: this === parent ? 0 : -(parent?.scrollTop ?? 0), height: this.dataset.virtualKey ? heights.get(this.dataset.virtualKey) ?? 100 : 0 } as DOMRect;
  });
}
const history = Array.from({ length: 300 }, (_, id) => ({ id: String(id) }));
const keyOf = (item: { id: string }) => item.id;
it('monta somente o fim no primeiro commit, sem montar o topo, e ancora antes de exibir', () => {
  mockGeometry();
  const mounted: string[] = [];
  function Row({ id }: { id: string }) {
    useLayoutEffect(() => { mounted.push(id); }, [id]);
    return <div data-testid="row">{id}</div>;
  }
  const scroll = createRef<HTMLDivElement>();
  render(<div ref={scroll} data-testid="scroll"><VirtualList initialAnchor="end" items={history} itemKey={keyOf} scrollRef={scroll} estimate={100} renderItem={(item) => <Row id={item.id} />} /></div>);
  expect(mounted).toContain('299');
  expect(mounted).not.toContain('0');
  expect(Math.min(...mounted.map(Number))).toBeGreaterThan(270);
  expect(scroll.current!.scrollTop).toBe(scroll.current!.scrollHeight - scroll.current!.clientHeight);
  expect(screen.getAllByTestId('row').length).toBeLessThan(25);
});
it('mostra antigas ao subir e preserva a mensagem ancorada quando chegam páginas anteriores', () => {
  mockGeometry();
  const scroll = createRef<HTMLDivElement>();
  const view = (items: typeof history) => <div ref={scroll} data-testid="scroll"><VirtualList initialAnchor="end" items={items} itemKey={keyOf} scrollRef={scroll} estimate={100} renderItem={(item) => <div>{item.id}</div>} /></div>;
  const { rerender } = render(view(history.slice(100)));
  fireEvent.scroll(scroll.current!, { target: { scrollTop: 200 } });
  expect(screen.getByText('102')).toBeInTheDocument();
  rerender(view(history));
  expect(scroll.current!.scrollTop).toBe(10200);
  fireEvent.scroll(scroll.current!);
  expect(screen.getByText('102')).toBeInTheDocument();
  fireEvent.scroll(scroll.current!, { target: { scrollTop: 0 } });
  expect(screen.getByText('0')).toBeInTheDocument();
});
it('reply alcança uma mensagem fora da janela sem voltar à âncora final', () => {
  mockGeometry();
  const scroll = createRef<HTMLDivElement>();
  const jump = createRef<((index: number) => void) | null>();
  render(<div ref={scroll} data-testid="scroll"><VirtualList initialAnchor="end" items={history} itemKey={keyOf} scrollRef={scroll} scrollToIndexRef={jump} estimate={100} renderItem={(item) => <div>{item.id}</div>} /></div>);
  expect(screen.queryByText('20')).not.toBeInTheDocument();
  act(() => jump.current!(20));
  expect(screen.getByText('20')).toBeInTheDocument();
  expect(scroll.current!.scrollTop).toBe(2000);
  fireEvent.scroll(scroll.current!);
  expect(screen.queryByText('299')).not.toBeInTheDocument();
});
it('reancora no fundo quando a mídia muda de altura e mantém a leitura ao redimensionar acima', () => {
  const heights = new Map<string, number>();
  mockGeometry(heights);
  const callbacks = new Map<Element, ResizeObserverCallback>();
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) { callbacks.set(target, this.callback); }
    disconnect() {}
  });
  const scroll = createRef<HTMLDivElement>();
  const { container } = render(<div ref={scroll} data-testid="scroll"><VirtualList initialAnchor="end" items={history} itemKey={keyOf} scrollRef={scroll} estimate={100} renderItem={(item) => <div>{item.id}</div>} /></div>);
  const resize = (id: string, height: number) => {
    heights.set(id, height);
    const row = container.querySelector(`[data-virtual-key="${id}"]`)!;
    act(() => callbacks.get(row)!([], {} as ResizeObserver));
  };
  resize('299', 400);
  expect(screen.getByText('299')).toBeInTheDocument();
  expect(scroll.current!.scrollTop).toBe(scroll.current!.scrollHeight - scroll.current!.clientHeight);
  fireEvent.scroll(scroll.current!, { target: { scrollTop: 2000 } });
  resize('18', 250);
  expect(scroll.current!.scrollTop).toBe(2150);
  fireEvent.scroll(scroll.current!);
  expect(screen.getByText('20')).toBeInTheDocument();
});
