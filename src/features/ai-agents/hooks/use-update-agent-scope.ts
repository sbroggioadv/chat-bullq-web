import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agentScopeService, type AgentScopePayload } from '../services/agent-scope.service';

export function useUpdateAgentScope(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgentScopePayload) => agentScopeService.update(agentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-agent', agentId] });
      qc.invalidateQueries({ queryKey: ['ai-agents'] });
    },
  });
}
