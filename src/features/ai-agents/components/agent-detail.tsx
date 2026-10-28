'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Button,
  Pill,
  SegmentedControl,
  Switch,
} from '@/components/ui/foundation';
import { useOrgId } from '@/hooks/use-org-query-key';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';
import {
  EditAgentDialog,
  AgentSkillsAndTools,
} from '@/features/ai-agents/components/edit-agent-dialog';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { AgentScopeForm } from '@/features/ai-agents/components/agent-scope-form';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';

export function AgentDetail({
  agentId,
  onBack,
}: {
  agentId: string;
  onBack: () => void;
}) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [tab, setTab] = useState('summary');
  const [toggling, setToggling] = useState(false);
  const {
    data: agent,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['ai-agent', orgId, agentId],
    queryFn: () => aiAgentsService.findOne(agentId),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['ai-agent', orgId, agentId] });
    await qc.invalidateQueries({ queryKey: ['ai-agents'] });
  };
  const scope = agent as typeof agent & {
    pipelineScope?: string[];
    mentionHandle?: string | null;
    rateLimitPerHour?: number;
    consecutiveMsgCap?: number;
    humanizationEnabled?: boolean;
    minDelayMs?: number;
  };
  const hasScope =
    scope &&
    Array.isArray(scope.pipelineScope) &&
    typeof scope.rateLimitPerHour === 'number' &&
    typeof scope.consecutiveMsgCap === 'number' &&
    typeof scope.humanizationEnabled === 'boolean' &&
    typeof scope.minDelayMs === 'number';
  return (
    <div className={styles.workspace}>
      <div className="px-6 pt-4">
        <Button onClick={onBack}>← Agentes</Button>
      </div>
      {isPending ? (
        <p className="p-6" role="status">
          Carregando agente…
        </p>
      ) : isError || !agent ? (
        <p className="p-6" role="alert">
          Não foi possível carregar este agente.
        </p>
      ) : (
        <>
          <header className={styles.header}>
            <div>
              <h1>{agent.name}</h1>
              <p>
                {agent.description} · {agent.modelId}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Pill tone="agent">
                {agent.kind === 'ORCHESTRATOR' ? 'Orquestrador' : 'Worker'}
              </Pill>
              <span>{agent.isActive ? 'Ativo' : 'Pausado'}</span>
              <Switch
                label="Agente ativo"
                checked={agent.isActive}
                disabled={toggling}
                onChange={async (isActive) => {
                  setToggling(true);
                  try {
                    await aiAgentsService.update(agentId, { isActive });
                    await refresh();
                  } catch {
                    toast.error('Não foi possível alterar o agente');
                  } finally {
                    setToggling(false);
                  }
                }}
              />
            </div>
          </header>
          <nav className={styles.tabs}>
            <SegmentedControl
              label="Página do agente"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'summary', label: 'Resumo e execuções' },
                { value: 'prompt', label: 'Prompt' },
                { value: 'skills', label: 'Skills e tools' },
                { value: 'where', label: 'Onde atua' },
                { value: 'scope', label: 'Cadência' },
                { value: 'test', label: 'Testar' },
              ]}
            />
          </nav>
          {tab === 'summary' && (
            <>
              <div className={styles.note}>
                <strong>Como melhorar este agente</strong>
                <p>
                  Ainda não disponível. As execuções estão abaixo; a API não
                  fornece recomendações de melhoria.
                </p>
              </div>
              <JarvisAgentTab key={agentId} initialAgentId={agentId} />
            </>
          )}
          {tab === 'prompt' && (
            <div className={styles.note}>
              Histórico de versões do prompt ainda não disponível. Salvar
              atualiza o prompt atual.
            </div>
          )}
          <div hidden={tab !== 'prompt' && tab !== 'where'}>
            <EditAgentDialog
              key={agentId}
              embedded
              section={tab === 'where' ? 'where' : 'prompt'}
              agent={agent}
              onClose={onBack}
              onSaved={refresh}
            />
          </div>
          {tab === 'skills' && (
            <div className="p-6">
              <AgentSkillsAndTools key={agentId} agentId={agentId} />
            </div>
          )}
          {tab === 'scope' && (
            <div className="p-6">
              {hasScope ? (
                <AgentScopeForm
                  key={agentId}
                  agent={{
                    id: agent.id,
                    name: agent.name,
                    pipelineScope: scope.pipelineScope!,
                    mentionHandle: scope.mentionHandle ?? null,
                    rateLimitPerHour: scope.rateLimitPerHour!,
                    consecutiveMsgCap: scope.consecutiveMsgCap!,
                    humanizationEnabled: scope.humanizationEnabled!,
                    minDelayMs: scope.minDelayMs!,
                  }}
                />
              ) : (
                <p>
                  Onde atua e cadência ainda não disponíveis para este agente.
                  Os canais podem ser configurados em Prompt e configuração.
                </p>
              )}
            </div>
          )}
          {tab === 'test' && (
            <div className={styles.note}>
              <strong>Teste antes de mudar em produção</strong>
              <p>
                Simulação ainda não disponível na API. Nenhuma mensagem será
                enviada a clientes por esta tela.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
