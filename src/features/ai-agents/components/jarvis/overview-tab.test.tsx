import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { JarvisOverviewTab } from '@/features/ai-agents/components/jarvis/overview-tab';
import {
  aiAgentsService,
  type OrgStats,
} from '@/features/ai-agents/services/ai-agents.service';

vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/ai-agents/services/ai-agents.service', () => ({
  aiAgentsService: { orgStats: vi.fn(), list: vi.fn(), feed: vi.fn() },
}));
const stats: OrgStats = {
  period: '30d',
  since: '2026-10-01',
  runs: { total: 10, completed: 9, failed: 1, skipped: 0, successRate: 90 },
  tokens: { total: 42, input: 30, output: 12, cacheRead: 7, cacheWrite: 0 },
  cost: { usd: 1, avgPerRun: 0.1 },
  latency: { p50: 100, p95: 500 },
  monthlyCap: { used: 42, cap: 100, percentUsed: 42 },
  byModel: [{ modelId: 'modelo', runs: 10, tokens: 42, cost: 1 }],
  byAgent: [{ agentId: 'agent-a', runs: 10, tokens: 42, cost: 1 }],
  byFinalAction: { REPLIED: 9 },
  tools: [{ name: 'Tool de teste', calls: 3 }],
  handoffs: [{ fromAgentId: 'agent-a', toAgentId: 'agent-b', count: 2 }],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue(stats);
  vi.mocked(aiAgentsService.list).mockResolvedValue([
    { id: 'agent-a', name: 'Agente de teste' },
    { id: 'agent-b', name: 'Outro agente' },
  ] as Awaited<ReturnType<typeof aiAgentsService.list>>);
  vi.mocked(aiAgentsService.feed).mockResolvedValue([]);
});
afterEach(cleanup);
async function open() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <JarvisOverviewTab />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Por agente' });
}
it('troca o período no cartão de custo sem criar a linha extra de atualização', async () => {
  await open();
  expect(screen.queryByText(/Dados da organização/)).not.toBeInTheDocument();
  const period = screen.getByRole('combobox', {
    name: 'Período das execuções',
  });
  expect(period.closest('section')).toHaveTextContent('Custo');
  for (const value of ['24h', '7d', '30d']) {
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Período das execuções' }),
      { target: { value } },
    );
    await waitFor(() =>
      expect(aiAgentsService.orgStats).toHaveBeenLastCalledWith(value),
    );
    await screen.findByRole('heading', { name: 'Por agente' });
  }
});
it('mantém sucesso indisponível sem extrapolar o feed e abre a página do agente', async () => {
  await open();
  const panel = screen.getByRole('region', { name: 'Por agente' });
  expect(within(panel).getByText('Sucesso')).toBeVisible();
  expect(
    within(panel).getByLabelText('Sucesso por agente indisponível'),
  ).toHaveTextContent('—');
  expect(within(panel).getByRole('link')).toHaveAttribute(
    'href',
    '/ai-agents?agentId=agent-a',
  );
});
it('agrupa tools e passagens, mantendo tokens e limites acessíveis no popover', async () => {
  await open();
  const panel = screen.getByRole('region', {
    name: 'Tools e passagens entre agentes',
  });
  expect(within(panel).getByText('Tool de teste')).toBeVisible();
  expect(
    within(panel).getByText('Agente de teste → Outro agente'),
  ).toBeVisible();
  expect(
    screen.queryByText(/Limite mensal de tokens:/),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Tokens, limites e latência' }),
  );
  expect(await screen.findByText(/Limite mensal de tokens:/)).toHaveTextContent(
    '42 / 100',
  );
  expect(screen.getByText(/42 tokens/)).toHaveTextContent('7 em cache');
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Tokens, limites e latência' }),
    { key: 'Escape' },
  );
  await waitFor(() =>
    expect(
      screen.queryByText(/Limite mensal de tokens:/),
    ).not.toBeInTheDocument(),
  );
});
it('mantém a coluna Sucesso e os estados vazios sem execuções', async () => {
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue({
    ...stats,
    byAgent: [],
    tools: [],
    handoffs: [],
  });
  await open();
  expect(screen.getByText('Sucesso')).toBeVisible();
  expect(screen.getByText('Sem execuções no período.')).toBeVisible();
  expect(screen.getByText('Nenhuma execução recente.')).toBeVisible();
});
