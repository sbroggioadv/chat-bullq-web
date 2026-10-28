import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { VirtualList } from '@/features/inbox/components/virtual-list';
afterEach(cleanup);
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
