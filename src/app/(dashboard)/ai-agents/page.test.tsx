import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import AiAgentsPage from '@/app/(dashboard)/ai-agents/page';
const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  params: new URLSearchParams(),
  suspend: false,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => {
    if (navigation.suspend) throw new Promise(() => {});
    return navigation.params;
  },
}));
vi.mock('@/features/ai-agents/components/agent-detail', () => ({
  AgentDetail: () => <p>Página do agente</p>,
}));
vi.mock('@/features/ai-agents/components/create-agent-dialog', () => ({
  CreateAgentDialog: () => null,
}));
vi.mock('@/features/ai-agents/components/agents-list', () => ({
  AgentsList: () => <p>Organograma real</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/overview-tab', () => ({
  JarvisOverviewTab: () => <p>Visão geral real</p>,
  OverviewControls: () => <p>Controles do resumo</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/agent-tab', () => ({
  JarvisAgentTab: () => <p>Estatísticas individuais</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/scope-tab', () => ({
  JarvisScopeTab: () => <p>Configuração de cadência</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/skills-tab', () => ({
  JarvisSkillsTab: () => <p>Catálogo de skills</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/tools-tab', () => ({
  JarvisToolsTab: () => <p>Catálogo de tools</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/runs-tab', () => ({
  JarvisRunsTab: () => <p>Histórico de execuções</p>,
}));
vi.mock('@/features/ai-agents/components/jarvis/watchdog-tab', () => ({
  JarvisWatchdogTab: () => <p>Monitor watchdog</p>,
}));
afterEach(() => {
  cleanup();
  navigation.suspend = false;
  vi.clearAllMocks();
});
function open(tab: string) {
  navigation.params = new URLSearchParams({ tab });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AiAgentsPage />
    </QueryClientProvider>,
  );
}
it.each([
  ['overview', 'Visão geral real'],
  ['agents', 'Organograma real'],
  ['skills', 'Catálogo de skills'],
  ['tools', 'Catálogo de tools'],
  ['runs', 'Histórico de execuções'],
  ['watchdog', 'Monitor watchdog'],
  ['agent', 'Estatísticas individuais'],
  ['scope', 'Configuração de cadência'],
])('preserva o destino %s sem depender da JarvisTree', (tab, content) => {
  open(tab);
  expect(screen.getByText(content)).toBeVisible();
  const tabs = screen.getByRole('navigation', { name: 'Área de agentes' });
  for (const label of [
    'Visão geral',
    'Agentes',
    'Skills',
    'Tools',
    'Execuções',
    'Watchdog',
  ]) {
    fireEvent.click(
      within(tabs).getByRole('button', { name: label, exact: true }),
    );
  }
  expect(navigation.push).toHaveBeenCalledTimes(6);
});
it.each(['agents', 'agent', 'scope'])(
  'permite alternar organograma, estatísticas e cadência a partir de %s',
  (tab) => {
    open(tab);
    const nav = screen.getByRole('navigation', { name: 'Explorar agentes' });
    for (const [label, target] of [
      ['Organograma', 'agents'],
      ['Por agente', 'agent'],
      ['Scope & Cadência', 'scope'],
    ]) {
      fireEvent.click(within(nav).getByRole('button', { name: label }));
      expect(navigation.push).toHaveBeenLastCalledWith(
        `/ai-agents?tab=${target}`,
      );
    }
    expect(
      within(
        screen.getByRole('navigation', { name: 'Área de agentes' }),
      ).getByRole('button', { name: 'Agentes', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
);

it('mantém um único título e ações enquanto URL/conteúdo suspendem, com esqueleto sem título', () => {
  navigation.suspend = true;
  open('overview');
  expect(screen.getAllByRole('heading', { name: 'Agentes' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Novo agente' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Conversar com o Jarvis' }),
  ).toBeVisible();
  expect(
    screen.getByRole('status', { name: 'Carregando página' }),
  ).toBeVisible();
  expect(
    within(screen.getByRole('status')).queryByRole('heading'),
  ).not.toBeInTheDocument();
});
it('preserva a página individual sem o cabeçalho da visão geral', () => {
  navigation.params = new URLSearchParams({ agentId: 'a' });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AiAgentsPage />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Página do agente')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Agentes' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Controles do resumo')).not.toBeInTheDocument();
});
