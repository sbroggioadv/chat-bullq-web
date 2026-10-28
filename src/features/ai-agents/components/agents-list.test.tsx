import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Node, NodeChange } from '@xyflow/react';
import {
  AgentsList,
  layoutOrganogram,
} from '@/features/ai-agents/components/agents-list';
import type { AiAgent } from '@/features/ai-agents/services/ai-agents.service';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'org' }));
vi.mock('@/features/ai-agents/services/ai-agents.service', () => ({
  aiAgentsService: {
    list: vi
      .fn()
      .mockResolvedValue([
        { id: 'a', department: 'Comercial', parentAgentId: null },
      ]),
  },
}));
vi.mock('@/features/ai-agents/components/create-agent-dialog', () => ({
  CreateAgentDialog: () => null,
}));
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    colorMode,
    nodes,
    onNodesChange,
  }: {
    colorMode?: string;
    nodes: Node[];
    onNodesChange?: (changes: NodeChange[]) => void;
  }) => (
    <div data-testid="flow" data-mode={colorMode}>
      <output>
        {JSON.stringify(nodes.find((node) => node.id === 'a')?.position)}
      </output>
      <output aria-label="Dimensões do minimapa">
        {JSON.stringify(nodes.find((node) => node.id === 'a')?.measured)}
      </output>
      <button
        onClick={() =>
          onNodesChange?.([
            { id: 'a', type: 'position', position: { x: 123, y: 456 } },
            {
              id: 'a',
              type: 'dimensions',
              dimensions: { width: 320, height: 180 },
            },
          ])
        }
      >
        Arrastar fixture
      </button>
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-mode');
  document.documentElement.classList.remove('dark');
});

it('acompanha data-mode e .dark do app, inclusive mudanças após montagem', async () => {
  document.documentElement.dataset.mode = 'dark';
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AgentsList />
    </QueryClientProvider>,
  );
  expect(await screen.findByTestId('flow')).toHaveAttribute(
    'data-mode',
    'dark',
  );
  await act(async () => {
    document.documentElement.dataset.mode = 'light';
  });
  await waitFor(() =>
    expect(screen.getByTestId('flow')).toHaveAttribute('data-mode', 'light'),
  );
  await act(async () => {
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.classList.add('dark');
  });
  await waitFor(() =>
    expect(screen.getByTestId('flow')).toHaveAttribute('data-mode', 'dark'),
  );
  await act(async () => {
    document.documentElement.classList.remove('dark');
  });
  await waitFor(() =>
    expect(screen.getByTestId('flow')).toHaveAttribute('data-mode', 'light'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Arrastar fixture' }));
  expect(screen.getByText('{"x":123,"y":456}')).toBeVisible();
  expect(
    screen.getByRole('status', { name: 'Dimensões do minimapa' }),
  ).toHaveTextContent('{"width":320,"height":180}');
});

function agent(
  id: string,
  department: string | null,
  parentAgentId: string | null = null,
  kind = 'WORKER',
): AiAgent {
  return {
    id,
    name: id,
    department,
    parentAgentId,
    kind,
    channels: [],
  } as unknown as AiAgent;
}

it('agrupa departamentos reais, preserva chefias cruzadas e não inventa ligação para órfão', () => {
  const agents = [
    agent('root', 'Atendimento', null, 'ORCHESTRATOR'),
    agent('sales', 'Comercial', 'root'),
    agent('law', 'Jurídico', 'sales'),
    agent('law-child', 'Jurídico', 'law'),
    agent('unassigned', null, 'root'),
    agent('orphan', null, 'missing'),
  ];
  const { nodes, columns, edges } = layoutOrganogram(agents);
  const position = (id: string) =>
    nodes.find((node) => node.id === id)!.position;
  expect(columns.map((column) => column.data.label)).toEqual([
    'Comercial',
    'Jurídico',
    'Sem departamento',
  ]);
  expect(position('law').x).toBe(position('law-child').x);
  expect(position('law').x).not.toBe(position('sales').x);
  expect(position('unassigned').x).toBe(position('orphan').x);
  expect(position('root').y).toBeLessThan(position('sales').y);
  expect(position('law-child').y).toBeGreaterThan(position('law').y);
  expect(edges.map(({ source, target }) => [source, target])).toEqual([
    ['root', 'sales'],
    ['sales', 'law'],
    ['law', 'law-child'],
    ['root', 'unassigned'],
  ]);
  expect(nodes.every((node) => node.draggable)).toBe(true);
  expect(nodes.map((node) => node.data.agent)).toEqual(agents);
});

it('mantém orquestrador sem departamento na coluna Sem departamento e aceita lista vazia', () => {
  const result = layoutOrganogram([agent('root', null, null, 'ORCHESTRATOR')]);
  expect(result.columns[0].data.label).toBe('Sem departamento');
  expect(result.nodes[0].position.y).toBeGreaterThan(
    result.columns[0].position.y,
  );
  expect(layoutOrganogram([])).toEqual({ nodes: [], columns: [], edges: [] });
});
