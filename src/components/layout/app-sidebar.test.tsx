import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/layout/app-sidebar';

const navigation = vi.hoisted(() => ({ pathname: '/settings/contacts' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/layout/app-shell', () => ({ useAppRail: () => ({ expanded: false, toggle: vi.fn() }) }));
vi.mock('@/features/theme/components/theme-mode-toggle', () => ({ ThemeModeToggle: () => null }));

describe('Item atual do trilho em Configurações', () => {
  it.each(['/settings/contacts', '/settings/profile'])('marca apenas Configurações em %s', (pathname) => {
    navigation.pathname = pathname;
    const { container } = render(<AppSidebar />);
    expect(screen.getByRole('link', { name: 'Contatos' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});
