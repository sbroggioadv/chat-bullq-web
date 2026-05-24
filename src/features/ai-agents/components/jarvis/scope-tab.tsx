'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { aiAgentsService, type AiAgent } from '../../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { AgentScopeForm } from '../agent-scope-form';

interface AgentWithScope extends AiAgent {
  pipelineScope: string[];
  mentionHandle: string | null;
  rateLimitPerHour: number;
  consecutiveMsgCap: number;
  humanizationEnabled: boolean;
  minDelayMs: number;
}

export function JarvisScopeTab() {
  const orgId = useOrgId();
  const [agentId, setAgentId] = useState<string>('');

  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  useEffect(() => {
    if (!agentId && agents && agents.length > 0) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  const { data: agent, isLoading } = useQuery<AgentWithScope>({
    queryKey: ['ai-agent', agentId],
    queryFn: async () => {
      const result = await aiAgentsService.findOne(agentId);
      // Provide S22 field defaults when backend hasn't deployed yet
      return {
        ...result,
        pipelineScope: (result as any).pipelineScope ?? [],
        mentionHandle: (result as any).mentionHandle ?? null,
        rateLimitPerHour: (result as any).rateLimitPerHour ?? 60,
        consecutiveMsgCap: (result as any).consecutiveMsgCap ?? 5,
        humanizationEnabled: (result as any).humanizationEnabled ?? true,
        minDelayMs: (result as any).minDelayMs ?? 15000,
      } as AgentWithScope;
    },
    enabled: !!agentId,
  });

  if (!agents) {
    return <div className="p-6 text-sm text-zinc-500">Carregando…</div>;
  }

  if (agents.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
          <Bot className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-600">
            Nenhum agente cadastrado ainda
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Crie um agente na aba &quot;Agentes&quot; pra começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.kind === 'ORCHESTRATOR' ? 'orquestrador' : a.category ?? 'worker'})
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-3xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Scope & Cadência</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Define onde {agent?.name ?? '…'} atua + cadência humanizada + limites anti-ban.
          </p>
        </div>

        {isLoading || !agent ? (
          <div className="text-sm text-zinc-500">Carregando…</div>
        ) : (
          <AgentScopeForm agent={agent} />
        )}
      </div>
    </div>
  );
}
