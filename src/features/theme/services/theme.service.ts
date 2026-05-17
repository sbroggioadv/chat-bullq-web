import { api } from '@/lib/api';
import type { OrgBrand, ThemeTokens } from '../types/brand';

interface UpdateBrandResponse {
  id: string;
  brand: OrgBrand;
}

interface UpdateThemeTokensResponse {
  id: string;
  themeTokens: ThemeTokens | null;
}

export const themeService = {
  /**
   * Atualiza o brand da org ativa. RBAC: só OWNER/ADMIN podem.
   * Throws 403 pra AGENT.
   */
  async updateOrgBrand(brand: OrgBrand): Promise<UpdateBrandResponse> {
    const { data } = await api.patch<{ data: UpdateBrandResponse }>(
      '/organizations/current',
      { brand },
    );
    return data.data;
  },

  /**
   * Sprint S18 Wave 3: aplica/remove tokens customizados pra org ativa.
   * Pass `null` pra remover (volta a usar só brand). Backend valida WCAG
   * AA e responde 422 com lista de pares falhos se contraste ruim.
   * RBAC: só OWNER/ADMIN.
   */
  async updateThemeTokens(themeTokens: ThemeTokens | null): Promise<UpdateThemeTokensResponse> {
    const { data } = await api.patch<{ data: UpdateThemeTokensResponse }>(
      '/organizations/current',
      { themeTokens },
    );
    return data.data;
  },
};
