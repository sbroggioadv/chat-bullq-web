import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';

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
