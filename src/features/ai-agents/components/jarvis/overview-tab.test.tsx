import { useState } from 'react';
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
import {
  JarvisOverviewTab,
  OverviewControls,
} from '@/features/ai-agents/components/jarvis/overview-tab';
import {
  aiAgentsService,
  type OrgStats,
  type Period,
} from '@/features/ai-agents/services/ai-agents.service';

const socket = vi.hoisted(() => ({ connected: false }));
vi.mock('@/features/inbox/hooks/use-socket', () => ({
  useSocket: () => socket,
}));
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
  socket.connected = false;
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue(stats);
  vi.mocked(aiAgentsService.list).mockResolvedValue([
    { id: 'agent-a', name: 'Agente de teste' },
    { id: 'agent-b', name: 'Outro agente' },
  ] as Awaited<ReturnType<typeof aiAgentsService.list>>);
  vi.mocked(aiAgentsService.feed).mockResolvedValue([]);
});
afterEach(cleanup);
function Overview() {
  const [period, setPeriod] = useState<Period>('30d');
  return (
    <>
      <header>
        <OverviewControls period={period} onPeriodChange={setPeriod} />
      </header>
      <JarvisOverviewTab period={period} />
    </>
  );
}
async function open() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Overview />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Por agente' });
}
it('troca o período no cabeçalho sem criar a linha extra de atualização', async () => {
  await open();
  expect(screen.queryByText(/Dados da organização/)).not.toBeInTheDocument();
  const period = screen.getByRole('combobox', {
    name: 'Período das execuções',
  });
  expect(period.closest('header')).not.toBeNull();
  expect(screen.getByText('Custo · 30 dias')).toBeVisible();
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

it('usa percentuais do total, mantém ações desconhecidas e não soma falhas aos resultados', async () => {
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue({
    ...stats,
    runs: { ...stats.runs, total: 1248, failed: 42, successRate: 94.7 },
    cost: { usd: 18.42, avgPerRun: 0.0147 },
    byFinalAction: {
      REPLIED: 1000,
      DELEGATED: 140,
      TRANSFERRED_TO_HUMAN: 84,
      NO_ACTION: 24,
      CUSTOM: 0,
    },
  });
  await open();
  const results = screen.getByRole('region', {
    name: 'Como as execuções terminaram',
  });
  for (const value of ['80,1%', '11,2%', '6,7%', '1,9%', '0%'])
    expect(within(results).getByText(value)).toBeVisible();
  expect(within(results).getByText('Sem ação')).toBeVisible();
  expect(within(results).getByText('CUSTOM')).toBeVisible();
  expect(
    within(results).getByText(
      /Erro: distribuição exclusiva ainda não disponível/,
    ),
  ).toBeVisible();
  expect(within(results).queryByText('3,4%')).not.toBeInTheDocument();
  expect(screen.getByText('US$ 18,42')).toBeVisible();
  expect(screen.getByText('94,7%')).toBeVisible();
  expect(screen.getByText('6,7% das execuções')).toBeVisible();
});
it('total zero não gera NaN nem barras enganosas; falhas mantêm o limiar real', async () => {
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue({
    ...stats,
    runs: { total: 0, completed: 0, failed: 0, skipped: 0, successRate: null },
    byFinalAction: { NONE: 0 },
  });
  await open();
  const results = screen.getByRole('region', {
    name: 'Como as execuções terminaram',
  });
  expect(within(results).getByText('Sem dados no período.')).toBeVisible();
  expect(results).not.toHaveTextContent('NaN');
  expect(screen.queryByText('Taxa de falha alta:')).not.toBeInTheDocument();
});
it('exibe alerta somente quando há pelo menos cinco execuções e mais de 30% de falhas', async () => {
  vi.mocked(aiAgentsService.orgStats).mockResolvedValue({
    ...stats,
    runs: { ...stats.runs, total: 5, failed: 2 },
  });
  await open();
  expect(screen.getByText('Taxa de falha alta:')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ver execuções' })).toHaveAttribute(
    'href',
    '/ai-agents?tab=runs',
  );
});
it('sinaliza conexão e mantém polling a cada dez segundos quando desconectado', async () => {
  await open();
  expect(screen.getByText('A cada 10 s')).toBeVisible();
  cleanup();
  socket.connected = true;
  await open();
  expect(screen.getByText('ao vivo')).toBeVisible();
  cleanup();
  socket.connected = false;
  await open();
  expect(screen.getByText('A cada 10 s')).toBeVisible();
});
