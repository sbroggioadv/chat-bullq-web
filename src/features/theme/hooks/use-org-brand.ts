'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { themeService } from '../services/theme.service';
import { DEFAULT_BRAND, type OrgBrand, type ThemeTokens } from '../types/brand';

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
  /** True enquanto a mutation de brand está rodando. */
  isUpdating: boolean;

  // ─── Sprint S18 Wave 3 — Theme Builder OKLCH ──────────────
  /** Tokens customizados ativos (null = sem custom, usa brand puro). */
  themeTokens: ThemeTokens | null;
  /**
   * Aplica/remove tokens customizados. Pass null pra remover (volta ao
   * brand puro). Otimista — auth-store atualiza imediatamente, rollback
   * em caso de erro 422 (WCAG fail) ou 403 (RBAC).
   */
  setThemeTokens: (tokens: ThemeTokens | null) => Promise<void>;
  /** True enquanto a mutation de themeTokens está rodando. */
  isUpdatingTokens: boolean;
}

export function useOrgBrand(): UseOrgBrandResult {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);
  const applyOrgBrandUpdate = useAuthStore((s) => s.applyOrgBrandUpdate);
  const applyOrgThemeTokensUpdate = useAuthStore((s) => s.applyOrgThemeTokensUpdate);
  const queryClient = useQueryClient();

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const brand = activeOrg?.brand ?? null;
  const effectiveBrand = brand ?? DEFAULT_BRAND;
  const role = activeOrg?.role;
  const themeTokens = activeOrg?.themeTokens ?? null;

  const brandMutation = useMutation({
    mutationFn: (next: OrgBrand) => themeService.updateOrgBrand(next),
    onMutate: async (next) => {
      if (!activeOrgId) return { previous: brand };
      const previous = brand;
      const previousTokens = themeTokens;
      applyOrgBrandUpdate(activeOrgId, next);
      // Aplicar um brand zera o tema custom — são mutuamente exclusivos.
      // Espelha o backend pra UI não seguir mostrando o override antigo.
      applyOrgThemeTokensUpdate(activeOrgId, null);
      return { previous, previousTokens };
    },
    onError: (err, _next, ctx) => {
      // Rollback otimista
      if (activeOrgId && ctx?.previous !== undefined) {
        if (ctx.previous === null) {
          // Sem método pra setar null — mantém último valor escolhido. Caso raro.
        } else {
          applyOrgBrandUpdate(activeOrgId, ctx.previous);
        }
      }
      // Restaura o tema custom que foi zerado otimisticamente no onMutate.
      if (activeOrgId && ctx?.previousTokens !== undefined) {
        applyOrgThemeTokensUpdate(activeOrgId, ctx.previousTokens);
      }
      const msg = err instanceof Error ? err.message : 'Erro ao salvar tema';
      toast.error('Não foi possível salvar a identidade visual', { description: msg });
    },
    onSuccess: () => {
      toast.success('Identidade visual atualizada');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const themeTokensMutation = useMutation({
    mutationFn: (next: ThemeTokens | null) => themeService.updateThemeTokens(next),
    onMutate: async (next) => {
      if (!activeOrgId) return { previous: themeTokens };
      const previous = themeTokens;
      applyOrgThemeTokensUpdate(activeOrgId, next);
      return { previous };
    },
    onError: (err, _next, ctx) => {
      // Rollback do override otimista
      if (activeOrgId && ctx?.previous !== undefined) {
        applyOrgThemeTokensUpdate(activeOrgId, ctx.previous);
      }
      // Server WCAG fail vem como 422 com payload `{ message, errors: string[] }`.
      // Tentamos extrair a lista pra dar feedback útil no toast.
      const anyErr = err as { response?: { data?: { errors?: string[]; message?: string } } };
      const errors = anyErr?.response?.data?.errors;
      const baseMsg = anyErr?.response?.data?.message ?? (err instanceof Error ? err.message : 'Erro');
      const description = errors && errors.length > 0
        ? errors.slice(0, 3).join(' · ')
        : baseMsg;
      toast.error('Tema custom rejeitado', { description });
    },
    onSuccess: (_data, variables) => {
      if (variables === null) {
        toast.success('Tema custom removido — usando brand original');
      } else {
        toast.success('Tema personalizado aplicado');
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const setBrand = useCallback(
    async (next: OrgBrand) => {
      if (next === brand) return;
      await brandMutation.mutateAsync(next);
    },
    [brand, brandMutation],
  );

  const setThemeTokens = useCallback(
    async (next: ThemeTokens | null) => {
      await themeTokensMutation.mutateAsync(next);
    },
    [themeTokensMutation],
  );

  return {
    brand,
    effectiveBrand,
    needsOnboarding: brand === null && role === 'OWNER',
    role,
    setBrand,
    isUpdating: brandMutation.isPending,
    themeTokens,
    setThemeTokens,
    isUpdatingTokens: themeTokensMutation.isPending,
  };
}
