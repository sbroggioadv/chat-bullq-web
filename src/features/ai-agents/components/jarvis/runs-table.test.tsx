import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RunsTable } from '@/features/ai-agents/components/jarvis/runs-table';
import type { FeedRun } from '@/features/ai-agents/services/ai-agents.service';
const run: FeedRun = {
  id: 'run-1',
  agentId: 'a',
  conversationId: 'conversation-1',
  modelId: 'modelo',
  status: 'FAILED',
  finalAction: 'NO_ACTION',
  errorMessage: 'Erro sintético',
  inputTokens: 30,
  outputTokens: 12,
  cacheReadTokens: 7,
  cacheWriteTokens: 0,
  costUsd: '0.10',
  durationMs: 200,
  startedAt: '2026-10-28T00:00:00Z',
  finishedAt: null,
  agent: { id: 'a', name: 'Agente de teste', kind: 'WORKER' },
  toolCalls: [
    {
      id: 'tool-1',
      toolName: 'Consulta sintética',
      input: {},
      output: null,
      error: 'Erro sintético',
      durationMs: 100,
      createdAt: '2026-10-28T00:00:00Z',
    },
  ],
};
afterEach(cleanup);
it('preserva tabela e detalhe para os consumidores existentes', () => {
  render(<RunsTable runs={[run]} />);
  expect(screen.getByRole('table')).toBeVisible();
  fireEvent.click(screen.getByText('Agente de teste'));
  expect(screen.getByText('run-1')).toBeVisible();
  expect(screen.getByText('Consulta sintética')).toBeVisible();
});
it('exibe cards expansíveis sem perder dados, cache, erro e tools', () => {
  const { container } = render(<RunsTable runs={[run]} appearance="cards" />);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  const card = container.querySelector('details')!;
  expect(card).not.toHaveAttribute('open');
  fireEvent.click(container.querySelector('summary')!);
  expect(card).toHaveAttribute('open');
  for (const text of [
    'Agente de teste',
    'run-1',
    'conversation-1',
    'Consulta sintética',
    'Erro sintético',
  ])
    expect(screen.getByText(text)).toBeVisible();
  expect(screen.getByText(/7 read/)).toBeVisible();
  expect(screen.getByText(/42 tokens/)).toBeVisible();
});
