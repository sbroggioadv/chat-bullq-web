'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { Bot, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  type AiAgent,
} from '@/features/ai-agents/services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { CreateAgentDialog } from '@/features/ai-agents/components/create-agent-dialog';
import {
  AgentNode,
  type AgentNodeData,
} from '@/features/ai-agents/components/agent-node';

const NODE_WIDTH = 320;
const NODE_HEIGHT = 260;

function DepartmentColumn({ data }: { data: { label: string } }) {
  return (
    <h3 className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--bq-t3)]">
      {data.label}
    </h3>
  );
}

const nodeTypes: NodeTypes = { agent: AgentNode, department: DepartmentColumn };

function subscribeAppTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-mode'],
  });
  return () => observer.disconnect();
}

function getAppColorMode(): 'dark' | 'light' {
  const root = document.documentElement;
  return root.dataset.mode === 'dark' || root.classList.contains('dark')
    ? 'dark'
    : 'light';
}

/**
 * Dagre orders the real hierarchy within each department. Root orchestrators
 * with a department sit above the columns, as in the approved mockup.
 * Every unassigned agent belongs to the explicit empty-department column.
 */
export function layoutOrganogram(agents: AiAgent[]): {
  nodes: Node<AgentNodeData>[];
  columns: Node[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    // Espaço entre nós irmãos (horizontal). Aumentar evita as edges
    // passarem por cima umas das outras quando 1 pai tem N filhos.
    nodesep: 100,
    // Espaço vertical entre níveis. Mais alto = mais "respiro" pras
    // linhas saírem retas antes de virar lateral.
    ranksep: 120,
    // Direciona o algoritmo a posicionar cada nó no centro do seu
    // pai (organograma "cartório") em vez de empilhar à esquerda.
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(agents.map((a) => a.id));

  for (const a of agents) {
    g.setNode(a.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const a of agents) {
    // Treat unknown parent as root (orphaned ref). Avoids broken edges
    // when an agent is hard-deleted but children weren't reparented.
    if (a.parentAgentId && ids.has(a.parentAgentId)) {
      g.setEdge(a.parentAgentId, a.id);
    }
  }

  dagre.layout(g);

  const roots = agents.filter(
    (a) =>
      a.kind === 'ORCHESTRATOR' &&
      a.department &&
      (!a.parentAgentId || !ids.has(a.parentAgentId)),
  );
  const rootIds = new Set(roots.map((a) => a.id));
  const grouped = new Map<string | null, AiAgent[]>();
  for (const agent of agents) {
    if (rootIds.has(agent.id)) continue;
    const department = agent.department || null;
    grouped.set(department, [...(grouped.get(department) ?? []), agent]);
  }
  const departments = [...grouped.keys()].sort((a, b) =>
    a === null ? 1 : b === null ? -1 : a.localeCompare(b, 'pt-BR'),
  );
  const columnWidth = NODE_WIDTH + 40;
  const columnGap = 64;
  const cardHeight = (agent: AiAgent) =>
    NODE_HEIGHT + (agent.channels?.length ?? 0) * 24;
  const top = roots.length ? Math.max(...roots.map(cardHeight)) + 100 : 20;
  const positions = new Map<string, XYPosition>();
  const width = Math.max(
    departments.length * (columnWidth + columnGap) - columnGap,
    roots.length * (NODE_WIDTH + columnGap) - columnGap,
  );
  roots.forEach((agent, index) =>
    positions.set(agent.id, {
      x:
        (width - roots.length * (NODE_WIDTH + columnGap) + columnGap) / 2 +
        index * (NODE_WIDTH + columnGap),
      y: 20,
    }),
  );
  const columns: Node[] = departments.map((department, index) => {
    const members = grouped.get(department)!;
    members.sort(
      (a, b) =>
        g.node(a.id).y - g.node(b.id).y ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );
    const x = index * (columnWidth + columnGap);
    let y = top + 48;
    for (const agent of members) {
      positions.set(agent.id, { x: x + 20, y });
      y += cardHeight(agent) + 36;
    }
    return {
      id: `department-column:${index}`,
      type: 'department',
      data: { label: department ?? 'Sem departamento' },
      position: { x, y: top },
      style: {
        width: columnWidth,
        height: y - top,
        border: '1px dashed var(--bq-hair-strong)',
        borderRadius: 16,
        background: 'var(--bq-surface)',
      },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      zIndex: -1,
    };
  });

  const nodes: Node<AgentNodeData>[] = agents.map((a) => {
    return {
      id: a.id,
      type: 'agent',
      position: positions.get(a.id)!,
      data: {
        agent: a,
        // overwritten by AgentsList with real handlers
        onClick: () => {},
        onToggleActive: () => {},
      },
      draggable: true,
    };
  });

  const edges: Edge[] = [];
  for (const a of agents) {
    if (a.parentAgentId && ids.has(a.parentAgentId)) {
      edges.push({
        id: `${a.parentAgentId}->${a.id}`,
        source: a.parentAgentId,
        target: a.id,
        // step (sem curvas) dá um L "engineering" tradicional pra
        // organograma; smoothstep com curvas faz N edges saindo do
        // mesmo handle se cruzarem visualmente perto do source.
        type: 'step',
        animated: false,
        style: { stroke: 'var(--bq-hair-strong)', strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges, columns };
}

export function AgentsList() {
  const colorMode = useSyncExternalStore(
    subscribeAppTheme,
    getAppColorMode,
    () => 'light' as const,
  );
  const [nodeState, setNodeState] = useState<
    Record<string, Partial<Pick<Node, 'position' | 'measured' | 'selected'>>>
  >({});
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodeState((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          next[change.id] = { ...next[change.id], position: change.position };
          changed = true;
        } else if (change.type === 'dimensions' && change.dimensions) {
          const measured = next[change.id]?.measured;
          if (
            measured?.width === change.dimensions.width &&
            measured?.height === change.dimensions.height
          )
            continue;
          next[change.id] = { ...next[change.id], measured: change.dimensions };
          changed = true;
        } else if (change.type === 'select') {
          next[change.id] = { ...next[change.id], selected: change.selected };
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, []);
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();
  const openAgent = useCallback(
    (agent: AiAgent) =>
      router.push(`/ai-agents?agentId=${encodeURIComponent(agent.id)}`),
    [router],
  );
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const {
    data: agents,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['ai-agents'] }),
    [queryClient],
  );

  const handleToggleActive = useCallback(
    async (agent: AiAgent) => {
      try {
        await aiAgentsService.update(agent.id, { isActive: !agent.isActive });
        toast.success(agent.isActive ? 'Agente desativado' : 'Agente ativado');
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alternar');
      }
    },
    [refresh],
  );

  // Distinct departments present, in stable order, for the filter chips.
  const departments = useMemo(() => {
    if (!agents) return [];
    return [
      ...new Set(
        agents.map((a) => a.department).filter((d): d is string => !!d),
      ),
    ].sort();
  }, [agents]);

  const filtered = useMemo(() => {
    if (!agents) return [];
    if (!deptFilter) return agents;
    return agents.filter((a) => a.department === deptFilter);
  }, [agents, deptFilter]);

  const { nodes, edges } = useMemo(() => {
    const out = layoutOrganogram(filtered);
    // inject real handlers (memoized layout doesn't know them)
    return {
      nodes: [
        ...out.columns,
        ...out.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onClick: openAgent,
            onToggleActive: handleToggleActive,
          },
        })),
      ].map((node) => ({ ...node, ...nodeState[node.id] })),
      edges: out.edges,
    };
  }, [filtered, openAgent, handleToggleActive, nodeState]);

  const hasAgents = (agents?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Organograma de agentes
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Hierarquia matricial — quem reporta a quem, agrupado por
            departamento
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo agente
        </button>
      </div>

      <p className="mx-6 my-3 rounded-xl border border-border p-3 text-sm text-muted-foreground">
        Prompts, canais, skills e histórico continuam como estão. Abra um agente
        para configurar e acompanhar suas execuções.
      </p>
      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500">
            Departamento:
          </span>
          <button
            onClick={() => setDeptFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              deptFilter === null
                ? 'bg-[var(--bq-agent-soft)] text-[var(--bq-agent-text)]'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          {departments.map((d) => {
            const active = deptFilter === d;
            return (
              <button
                key={d}
                onClick={() => setDeptFilter(active ? null : d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--bq-agent-soft)] text-[var(--bq-agent-text)]'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-[640px] min-h-[640px] w-full shrink-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ) : isError ? (
          <p role="alert" className="p-6">
            Não foi possível carregar o organograma. Tente novamente mais tarde.
          </p>
        ) : hasAgents ? (
          <ReactFlowProvider>
            <ReactFlow
              colorMode={colorMode}
              nodes={nodes}
              onNodesChange={onNodesChange}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={1.5}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              className="bg-zinc-50 dark:bg-zinc-950"
            >
              <Background gap={24} size={1} color="var(--bq-hair)" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) =>
                  node.type === 'department' ? 'transparent' : 'var(--bq-agent)'
                }
                className="!bg-white dark:!bg-zinc-900"
              />
            </ReactFlow>
          </ReactFlowProvider>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-10">
            <div className="rounded-xl border-2 border-dashed border-zinc-200 p-16 dark:border-zinc-800">
              <Bot className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Nenhum agente cadastrado ainda
              </p>
              <p className="mt-1 max-w-md text-center text-xs text-zinc-400 dark:text-zinc-500">
                Crie um agente, dê a ele um system prompt e atribua a um canal —
                configure os vínculos e ative quando estiver pronto.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar primeiro agente
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateAgentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
    </div>
  );
}
