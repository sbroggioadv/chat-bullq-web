import { api } from '@/lib/api';

/**
 * S19 Wave 1: shape do perfil da org retornado por GET /organizations/current.
 * Backend devolve o registro inteiro da tabela `organizations` — listamos aqui
 * apenas os campos consumidos pela aba Geral. Demais campos (themeTokens,
 * settings, watchdogConfig, etc.) sao gerenciados por outras features.
 */
export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationProfilePayload {
  name?: string;
  logoUrl?: string | null;
}

/**
 * S19 Wave 3: payload pra criar nova organizacao (workspace adicional).
 * Backend aceita apenas `name` — slug e demais campos sao gerados server-side
 * (slug deterministico via timestamp base36, plan='free' por default).
 */
export interface CreateOrganizationPayload {
  name: string;
}

export const organizationService = {
  /**
   * Carrega o perfil da org ativa (x-organization-id e injetado pelo interceptor).
   * Backend `OrganizationsController.getCurrent` ja retorna o registro completo
   * — pegamos so o subset que a aba Geral consome.
   */
  async getCurrent(): Promise<OrganizationProfile> {
    const { data } = await api.get<{ data: OrganizationProfile }>('/organizations/current');
    return data.data;
  },

  /**
   * Atualiza name e/ou logoUrl da org ativa. RBAC: OWNER/ADMIN apenas
   * (enforced no backend). Reutiliza o mesmo endpoint usado por theme.service
   * — passamos so os campos do perfil pra evitar overlap acidental com
   * brand/themeTokens/AI/watchdog.
   */
  async updateProfile(payload: UpdateOrganizationProfilePayload): Promise<OrganizationProfile> {
    const { data } = await api.patch<{ data: OrganizationProfile }>(
      '/organizations/current',
      payload,
    );
    return data.data;
  },

  /**
   * S19 Wave 3: cria nova org (workspace adicional) onde o user atual vira OWNER.
   * Backend cria Org + UserOrganization + Department "Geral" default em transacao.
   * Resposta inclui id/slug/plan recem-criados. Caller deve atualizar auth-store
   * (addOrganization + setActiveOrg) ANTES de reload da pagina pra ativar contexto.
   */
  async create(payload: CreateOrganizationPayload): Promise<OrganizationProfile> {
    const { data } = await api.post<{ data: OrganizationProfile }>(
      '/organizations',
      payload,
    );
    return data.data;
  },
};
