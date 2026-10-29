import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/features/ai-agents/services/ai-agents.service', () => ({
  aiAgentsService: { list: vi.fn().mockResolvedValue([]), feed: vi.fn().mockResolvedValue([]) },
}));

afterEach(cleanup);

it('identifica os filtros pelo nome acessível', () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JarvisRunsTab />
    </QueryClientProvider>,
  );

  for (const name of ['Período', 'Status', 'Agente']) {
    expect(screen.getByRole('combobox', { name })).toBeVisible();
  }
});

it('identifica visualmente as falhas de cada chamada de skill', async () => {
  const { aiAgentsService } = await import('@/features/ai-agents/services/ai-agents.service');
  const calls = [
    { name: 'erro', error: 'Falha explícita', output: null, failed: true },
    { name: 'ok-falso', error: null, output: { ok: false }, failed: true },
    { name: 'status-400', error: null, output: { status: 400 }, failed: true },
    { name: 'nulo', error: null, output: null, failed: false },
    { name: 'texto', error: null, output: 'texto', failed: false },
    { name: 'status-200', error: null, output: { status: 200 }, failed: false },
  ];
  vi.mocked(aiAgentsService.feed).mockResolvedValueOnce([{
    id: 'run-1', agentId: 'agent-1', conversationId: 'conversation-1', modelId: 'fixture',
    status: 'COMPLETED', finalAction: null, errorMessage: null, inputTokens: 0, outputTokens: 0,
    cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: '0', durationMs: null,
    startedAt: '2026-10-27T12:00:00Z', finishedAt: null,
    agent: { id: 'agent-1', name: 'Agente de teste', kind: 'WORKER' },
    toolCalls: calls.map(({ name, error, output }) => ({
      id: name, toolName: name, error, output, input: {}, durationMs: null,
      createdAt: '2026-10-27T12:00:00Z',
    })),
  }]);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JarvisRunsTab />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: /Agente de teste/ }));
  for (const { name, failed } of calls) {
    const card = screen.getByText(name).closest('div.rounded-lg');
    expect(card).not.toBeNull();
    expect(card?.classList.contains('border-red-200'), name).toBe(failed);
    expect(card?.classList.contains('border-zinc-200'), name).toBe(!failed);
  }
});
