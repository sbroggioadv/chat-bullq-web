import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTopbar } from '@/components/layout/app-topbar';

const socket = vi.hoisted(() => {
  const handlers = new Map<string, Array<() => void>>();
  return { on: (event: string, handler: () => void) => { handlers.set(event, [...(handlers.get(event) ?? []), handler]); }, dispatch: (event: string) => handlers.get(event)?.forEach((fn) => fn()) };
});
vi.mock('@/lib/socket', () => ({ getSocket: () => socket }));
vi.mock('next/navigation', () => ({ usePathname: () => '/settings/profile' }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  act(() => socket.dispatch('disconnect'));
});

describe('Estado real e teclado no topo', () => {
  it('exige ready, sai de Ao vivo ao desconectar e espera ready na reconexão', () => {
    render(<AppTopbar />);
    expect(screen.getByRole('status', { name: 'Sem conexão' })).toBeInTheDocument();
    act(() => socket.dispatch('connect'));
    expect(screen.queryByRole('status', { name: 'Ao vivo' })).not.toBeInTheDocument();
    act(() => socket.dispatch('ready'));
    expect(screen.getByRole('status', { name: 'Ao vivo' })).toBeInTheDocument();
    act(() => socket.dispatch('disconnect'));
    expect(screen.getByRole('status', { name: 'Sem conexão' })).toBeInTheDocument();
    act(() => socket.dispatch('connect'));
    expect(screen.queryByRole('status', { name: 'Ao vivo' })).not.toBeInTheDocument();
    act(() => socket.dispatch('ready'));
    expect(screen.getByRole('status', { name: 'Ao vivo' })).toBeInTheDocument();
  });

  it.each(['ctrlKey', 'metaKey'])('%s+K foca a busca e preserva a informação de indisponibilidade', (modifier) => {
    render(<AppTopbar />);
    const input = screen.getByRole('searchbox', { name: 'Busca global ainda não conectada' });
    fireEvent.keyDown(window, { key: 'k', [modifier]: true });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAccessibleDescription('Busca global ainda não conectada. Use as buscas de cada tela.');
  });

  it('não intercepta o atalho quando a busca está oculta nem depois de desmontar', () => {
    const { unmount } = render(<AppTopbar />);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    unmount();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const after = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});
