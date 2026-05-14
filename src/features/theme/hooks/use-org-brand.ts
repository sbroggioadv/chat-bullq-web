'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { themeService } from '../services/theme.service';
import { DEFAULT_BRAND, type OrgBrand } from '../types/brand';

interface UseOrgBrandResult {
  /** Brand atualmente persistido na org (null se não escolhido ainda). */
  brand: OrgBrand | null;
  /** Brand que está sendo renderizado agora (substitui null pelo default). */
  effectiveBrand: OrgBrand;
  /** True quando precisamos mostrar o wizard de onboarding pro OWNER. */
  needsOnboarding: boolean;
  /** Role do user na org ativa. */
  role: string | undefined;
  /** Muda o brand da org (otimista) e re-bate /auth/me em background. */
  setBrand: (brand: OrgBrand) => Promise<void>;
  /** True enquanto a mutation está rodando. */
  isUpdating: boolean;
}

export function useOrgBrand(): UseOrgBrandResult {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);
  const applyOrgBrandUpdate = useAuthStore((s) => s.applyOrgBrandUpdate);
  const queryClient = useQueryClient();

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const brand = activeOrg?.brand ?? null;
  const effectiveBrand = brand ?? DEFAULT_BRAND;
  const role = activeOrg?.role;

  const mutation = useMutation({
    mutationFn: (next: OrgBrand) => themeService.updateOrgBrand(next),
    onMutate: async (next) => {
      if (!activeOrgId) return { previous: brand };
      const previous = brand;
      applyOrgBrandUpdate(activeOrgId, next);
      return { previous };
    },
    onError: (err, _next, ctx) => {
      // Rollback otimista
      if (activeOrgId && ctx?.previous !== undefined) {
        if (ctx.previous === null) {
          // Sem método pra setar null — mantém último valor escolhido. Caso raro.
          // Realisticamente, se já tinha brand antes, ctx.previous é A|B|C.
        } else {
          applyOrgBrandUpdate(activeOrgId, ctx.previous);
        }
      }
      const msg = err instanceof Error ? err.message : 'Erro ao salvar tema';
      toast.error('Não foi possível salvar a identidade visual', { description: msg });
    },
    onSuccess: () => {
      toast.success('Identidade visual atualizada');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const setBrand = useCallback(
    async (next: OrgBrand) => {
      if (next === brand) return;
      await mutation.mutateAsync(next);
    },
    [brand, mutation],
  );

  return {
    brand,
    effectiveBrand,
    needsOnboarding: brand === null && role === 'OWNER',
    role,
    setBrand,
    isUpdating: mutation.isPending,
  };
}
