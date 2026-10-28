'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';
import { Pill, Switch } from '@/components/ui/foundation';
import type { AiAgent } from '@/features/ai-agents/services/ai-agents.service';

export type AgentNodeData = {
  agent: AiAgent;
  onClick: (agent: AiAgent) => void;
  onToggleActive: (agent: AiAgent) => void;
} & Record<string, unknown>;

function AgentNodeBase({ data }: { data: AgentNodeData }) {
  const { agent, onClick, onToggleActive } = data;
  return (
    <div className="relative w-[320px] rounded-xl border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] p-4 text-[var(--bq-t1)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!border-[var(--bq-hair)] !bg-[var(--bq-agent)]"
      />
      <button
        type="button"
        onClick={() => onClick(agent)}
        className="nodrag block w-full text-left focus-visible:outline-2 focus-visible:outline-[var(--bq-agent)]"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-[var(--bq-agent-soft)] p-2 text-[var(--bq-agent-text)]">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{agent.name}</h3>
            <p className="mt-1 text-xs text-[var(--bq-t3)]">{agent.modelId}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-xs text-[var(--bq-t2)]">
          {agent.description || 'Sem descrição'}
        </p>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill tone={agent.kind === 'ORCHESTRATOR' ? 'agent' : 'default'}>
          {agent.kind === 'ORCHESTRATOR' ? 'Orquestrador' : 'Worker'}
        </Pill>
        {agent.department && <Pill>{agent.department}</Pill>}
        {agent.squad && <Pill>{agent.squad}</Pill>}
      </div>
      <div className="nodrag mt-3 flex items-center justify-between text-xs text-[var(--bq-t3)]">
        <span>{agent.isActive ? 'Ativo' : 'Pausado'}</span>
        <Switch
          label={`${agent.isActive ? 'Pausar' : 'Ativar'} ${agent.name}`}
          checked={agent.isActive}
          onChange={() => onToggleActive(agent)}
        />
      </div>
      {(agent.channels ?? []).map((link) => (
        <p key={link.id} className="mt-2 truncate text-xs text-[var(--bq-t3)]">
          {link.channel.name} · {link.mode.toLowerCase()}
        </p>
      ))}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-[var(--bq-hair)] !bg-[var(--bq-agent)]"
      />
    </div>
  );
}
export const AgentNode = memo(AgentNodeBase);
