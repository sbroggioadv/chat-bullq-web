import { Suspense } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Loading from '@/app/(dashboard)/loading';
import { PageSkeleton } from '@/components/ui/foundation';
import { SettingsPageHeader, SETTINGS_PAGE_HEADER_FALLBACK } from '@/features/settings/components/settings-page-header';
import { AgentsPageHeader } from '@/features/ai-agents/components/agents-page-header';

const navigation = vi.hoisted(() => ({ pathname: '/settings/general', query: '', suspend: false }));
const pending = new Promise<never>(() => {});
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => {
    if (navigation.suspend) throw pending;
    return new URLSearchParams(navigation.query);
  },
}));

beforeEach(() => { navigation.query = ''; navigation.suspend = false; });
afterEach(cleanup);

describe('fallback geral sensível à rota', () => {
  it.each([
    ['/settings/general', 'Organização'],
    ['/settings/contacts', 'Contatos'],
    ['/settings', SETTINGS_PAGE_HEADER_FALLBACK.label],
    ['/settings/sections', SETTINGS_PAGE_HEADER_FALLBACK.label],
    ['/settings/channels/new', 'Canais'],
    ['/ai-agents', 'Agentes'],
  ])('mostra o cabeçalho da fonte compartilhada e o esqueleto em %s', (pathname, title) => {
    navigation.pathname = pathname;
    render(<Loading />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'Carregando página' })).toBeVisible();
  });

  it.each(['/inbox', '/pipelines', '/calendar', '/email', '/dashboard', '/projects', '/automations', '/settings-other', '/ai-agents/other'])(
    'preserva exatamente o markup do esqueleto em %s', pathname => {
      navigation.pathname = pathname;
      expect(renderToStaticMarkup(<Loading />)).toBe(renderToStaticMarkup(<PageSkeleton />));
    },
  );

  it.each(['agentId=fixture-agent', 'tab=agents&agentId=fixture-agent'])(
    'mantém somente o esqueleto no detalhe (%s)', query => {
      navigation.pathname = '/ai-agents'; navigation.query = query;
      render(<Loading />);
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Carregando página' })).toBeVisible();
    },
  );

  it('segue a página para agentId vazio e alterações na query', () => {
    navigation.pathname = '/ai-agents'; navigation.query = 'agentId=';
    const { rerender } = render(<Loading />);
    expect(screen.getByRole('heading', { level: 1, name: 'Agentes' })).toBeVisible();
    navigation.query = 'agentId=fixture-agent'; rerender(<Loading />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('não perde o esqueleto enquanto a query suspende', () => {
    navigation.pathname = '/ai-agents'; navigation.suspend = true;
    render(<Loading />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando página' })).toBeVisible();
  });

  it.each(['/settings/general', '/ai-agents'])(
    'substitui fallback pela página sem dois cabeçalhos acessíveis em %s', pathname => {
      navigation.pathname = pathname;
      function Page({ suspended }: { suspended: boolean }) {
        if (suspended) throw pending;
        return pathname === '/ai-agents' ? <AgentsPageHeader /> : <SettingsPageHeader pathname={pathname} />;
      }
      const { container, rerender } = render(<Suspense fallback={<Loading />}><Page suspended /></Suspense>);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('status', { name: 'Carregando página' })).toBeVisible();
      rerender(<Suspense fallback={<Loading />}><Page suspended={false} /></Suspense>);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.queryByRole('status', { name: 'Carregando página' })).not.toBeInTheDocument();
      expect(container.querySelectorAll('#settings-heading-actions')).toHaveLength(pathname.startsWith('/settings') ? 1 : 0);
    },
  );
});
