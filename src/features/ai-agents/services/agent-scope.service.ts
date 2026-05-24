import { api } from '@/lib/api';

export interface AgentScopePayload {
  pipelineScope?: string[];
  mentionHandle?: string | null;
  rateLimitPerHour?: number;
  consecutiveMsgCap?: number;
  humanizationEnabled?: boolean;
  minDelayMs?: number;
}

export const agentScopeService = {
  async update(agentId: string, payload: AgentScopePayload): Promise<void> {
    await api.patch(`/ai-agents/${agentId}`, payload);
  },
};
