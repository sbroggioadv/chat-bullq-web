import { api } from '@/lib/api';
import type { OrgBrand } from '../types/brand';

interface UpdateBrandResponse {
  id: string;
  brand: OrgBrand;
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
};
