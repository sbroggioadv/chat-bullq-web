import { api } from '@/lib/api';

/**
 * S18 Wave 2 — AI credentials per-org services
 */

export type AiProvider = 'ANTHROPIC' | 'OPENAI' | 'GEMINI';
export type AiCapability = 'LLM_AGENT' | 'TRANSCRIPTION' | 'EMBEDDINGS';
export type CredentialTestStatus = 'UNTESTED' | 'SUCCESS' | 'FAILURE';

export interface MaskedCredential {
  id: string;
  provider: AiProvider;
  keyHint: string;
  lastTestAt: string | null;
  lastTestStatus: CredentialTestStatus;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityRouting {
  organizationId: string;
  capability: AiCapability;
  providerSelected: AiProvider;
  modelOverride: string | null;
  updatedAt: string;
}

export interface LlmHealth {
  env: { anthropic: boolean; openai: boolean; gemini: boolean };
  orgsWithCustomCredentials: number;
  timestamp: string;
}

export const aiCredentialsService = {
  async list(): Promise<MaskedCredential[]> {
    const { data } = await api.get('/organizations/current/credentials');
    return data.data;
  },

  async upsert(provider: AiProvider, apiKey: string): Promise<MaskedCredential> {
    const { data } = await api.put(`/organizations/current/credentials/${provider}`, {
      apiKey,
    });
    return data.data;
  },

  async remove(provider: AiProvider): Promise<void> {
    await api.delete(`/organizations/current/credentials/${provider}`);
  },

  async test(provider: AiProvider): Promise<MaskedCredential> {
    const { data } = await api.post(`/organizations/current/credentials/${provider}/test`);
    return data.data;
  },

  async listRouting(): Promise<CapabilityRouting[]> {
    const { data } = await api.get('/organizations/current/capability-routing');
    return data.data;
  },

  async updateRouting(
    entries: Array<{
      capability: AiCapability;
      providerSelected: AiProvider;
      modelOverride?: string;
    }>,
  ): Promise<CapabilityRouting[]> {
    const { data } = await api.patch('/organizations/current/capability-routing', {
      entries,
    });
    return data.data;
  },

  async healthLlm(): Promise<LlmHealth> {
    const { data } = await api.get('/health/llm');
    // /health/llm não passa pelo ResponseInterceptor envelope normal
    // (controller retorna objeto direto). Fallback se vier envelope.
    return (data?.data ?? data) as LlmHealth;
  },
};
