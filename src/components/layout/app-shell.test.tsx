import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/layout/app-shell';

const navigation = vi.hoisted(() => ({ pathname: '/inbox' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
vi.mock('@/features/inbox-views/components/inbox-tree', () => ({ InboxTree: () => <div>Caixas de conversas</div> }));
vi.mock('@/components/layout/app-topbar', () => ({ AppTopbar: ({ navigationButton }: { navigationButton?: ReactNode }) => <header>{navigationButton}</header> }));

describe('Navegação secundária da casca', () => {
  it('preserva Caixas e o acesso móvel só em Conversas', () => {
    navigation.pathname = '/inbox';
    render(<AppShell sidebar={null}>Conteúdo</AppShell>);
    expect(screen.getByRole('navigation', { name: 'Navegação da seção' })).toHaveTextContent('Caixas de conversas');
    expect(screen.getByRole('button', { name: 'Abrir navegação da seção' })).toBeInTheDocument();
  });

  it.each(['/email', '/pipelines', '/pipelines/example', '/ai-agents', '/projects', '/settings/profile', '/dashboard', '/calendar', '/automations'])('não duplica a navegação interna em %s', (pathname) => {
    navigation.pathname = pathname;
    render(<AppShell sidebar={null}>Conteúdo</AppShell>);
    expect(screen.queryByRole('navigation', { name: 'Navegação da seção' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir navegação da seção' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Conteúdo');
  });
});
