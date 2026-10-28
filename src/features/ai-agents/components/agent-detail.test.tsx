import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { AgentDetail } from '@/features/ai-agents/components/agent-detail';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';

vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/ai-agents/services/ai-agents.service', () => ({
  aiAgentsService: { findOne: vi.fn() },
}));
vi.mock('@/features/ai-agents/components/edit-agent-dialog', () => ({
  EditAgentDialog: () => null,
  AgentSkillsAndTools: () => null,
}));
vi.mock('@/features/ai-agents/components/jarvis/agent-tab', () => ({
  JarvisAgentTab: () => null,
}));
vi.mock('@/features/ai-agents/components/agent-scope-form', () => ({
  AgentScopeForm: () => <form aria-label="Cadência recebida da API" />,
}));
afterEach(cleanup);

const scope = {
  pipelineScope: [],
  rateLimitPerHour: 0,
  consecutiveMsgCap: 0,
  humanizationEnabled: false,
  minDelayMs: 0,
};

async function openCadence(fields: Record<string, unknown>) {
  vi.mocked(aiAgentsService.findOne).mockResolvedValue({
    id: 'a',
    name: 'Agente',
    ...fields,
  } as Awaited<ReturnType<typeof aiAgentsService.findOne>>);
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AgentDetail agentId="a" onBack={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Cadência', exact: true }),
  );
}

it.each([
  'pipelineScope',
  'rateLimitPerHour',
  'consecutiveMsgCap',
  'humanizationEnabled',
  'minDelayMs',
])('mantém o vazio sem %s e aponta para Onde atua', async (field) => {
  await openCadence({ ...scope, [field]: undefined });
  expect(
    screen.getByText(/Os canais podem ser configurados em Onde atua/),
  ).toBeVisible();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Onde atua' })).toBeVisible();
});

it('exibe cadência quando todos os campos chegam, inclusive zero e false', async () => {
  await openCadence(scope);
  expect(
    screen.getByRole('form', { name: 'Cadência recebida da API' }),
  ).toBeVisible();
});
