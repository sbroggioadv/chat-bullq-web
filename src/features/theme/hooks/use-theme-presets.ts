/**
 * Sprint S18 Wave 4 — Theme Presets Library (Fase 2 frontend)
 *
 * Hook unificado pra lista + mutações de presets. Query keys:
 *   ['theme-presets', orgId]            → lista
 *
 * Padrões herdados de `use-org-brand`:
 *   - Mutations otimistas com rollback no erro 422 (WCAG) ou 409 (nome dup)
 *   - Toasts via sonner (success/error)
 *   - Invalida ['auth', 'me'] no sucesso de activate/deactivate pra repintar
 *     o BrandThemeBridge (que lê themeTokens do auth-store)
 */

'use client';

import { useCallback } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  themePresetsService,
  type ThemePreset,
} from '../services/theme-presets.service';
import type { ThemeTokens } from '../types/brand';

interface UseThemePresetsResult {
  presets: ThemePreset[];
  activePreset: ThemePreset | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;

  create: (payload: { name: string; tokens: ThemeTokens }) => Promise<ThemePreset>;
  isCreating: boolean;

  update: (
    presetId: string,
    payload: { name?: string; tokens?: ThemeTokens },
  ) => Promise<ThemePreset>;
  isUpdating: boolean;

  remove: (presetId: string) => Promise<void>;
  isRemoving: boolean;

  activate: (presetId: string) => Promise<void>;
  isActivating: boolean;

  deactivate: () => Promise<void>;
  isDeactivating: boolean;
}

export function useThemePresets(): UseThemePresetsResult {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const applyOrgThemeTokensUpdate = useAuthStore((s) => s.applyOrgThemeTokensUpdate);
  const queryClient = useQueryClient();

  const queryKey = ['theme-presets', activeOrgId] as const;

  const query = useQuery<ThemePreset[], Error>({
    queryKey,
    queryFn: () => themePresetsService.list(),
    enabled: Boolean(activeOrgId),
    staleTime: 30_000,
  });

  const presets = query.data ?? [];
  const activePreset = presets.find((p) => p.isActive) ?? null;

  // ─── Helpers de extração de erro server ─────────────────
  function extractErrorDescription(err: unknown): string {
    const anyErr = err as { response?: { data?: { errors?: string[]; message?: string } } };
    const errors = anyErr?.response?.data?.errors;
    if (errors && errors.length > 0) return errors.slice(0, 3).join(' · ');
    return (
      anyErr?.response?.data?.message ??
      (err instanceof Error ? err.message : 'Erro desconhecido')
    );
  }

  // ─── CREATE ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; tokens: ThemeTokens }) =>
      themePresetsService.create(payload),
    onSuccess: (preset) => {
      // Anexa otimisticamente ao cache da lista
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev ? [...prev, preset] : [preset],
      );
      toast.success(`Preset "${preset.name}" criado`);
    },
    onError: (err) => {
      toast.error('Não foi possível criar o preset', {
        description: extractErrorDescription(err),
      });
    },
  });

  // ─── UPDATE ─────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      presetId,
      payload,
    }: {
      presetId: string;
      payload: { name?: string; tokens?: ThemeTokens };
    }) => themePresetsService.update(presetId, payload),
    onMutate: async ({ presetId, payload }) => {
      const previous = queryClient.getQueryData<ThemePreset[]>(queryKey);
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev?.map((p) =>
          p.id === presetId
            ? {
                ...p,
                ...(payload.name !== undefined ? { name: payload.name } : {}),
                ...(payload.tokens !== undefined ? { tokens: payload.tokens } : {}),
              }
            : p,
        ),
      );
      return { previous };
    },
    onSuccess: (preset, { payload }) => {
      // Repinta cache com versão do server
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev?.map((p) => (p.id === preset.id ? preset : p)),
      );
      // Se o preset ativo foi editado, atualiza auth-store pra
      // BrandThemeBridge repintar imediatamente
      if (preset.isActive && payload.tokens !== undefined && activeOrgId) {
        applyOrgThemeTokensUpdate(activeOrgId, preset.tokens);
      }
      toast.success(`Preset "${preset.name}" atualizado`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error('Não foi possível atualizar o preset', {
        description: extractErrorDescription(err),
      });
    },
  });

  // ─── DELETE ─────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (presetId: string) => themePresetsService.delete(presetId),
    onMutate: async (presetId) => {
      const previous = queryClient.getQueryData<ThemePreset[]>(queryKey);
      const wasActive = previous?.find((p) => p.id === presetId)?.isActive ?? false;
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev?.filter((p) => p.id !== presetId),
      );
      return { previous, wasActive };
    },
    onSuccess: (_data, _presetId, ctx) => {
      // Se deletou o ativo, zera o auth-store pra UI cair pro brand base
      if (ctx?.wasActive && activeOrgId) {
        applyOrgThemeTokensUpdate(activeOrgId, null);
      }
      toast.success('Preset removido');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error('Não foi possível remover', {
        description: extractErrorDescription(err),
      });
    },
  });

  // ─── ACTIVATE ───────────────────────────────────────────
  const activateMutation = useMutation({
    mutationFn: (presetId: string) => themePresetsService.activate(presetId),
    onMutate: async (presetId) => {
      const previous = queryClient.getQueryData<ThemePreset[]>(queryKey);
      const target = previous?.find((p) => p.id === presetId);
      // Otimismo: marca o alvo como ativo e desmarca os outros
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev?.map((p) => ({ ...p, isActive: p.id === presetId })),
      );
      if (target && activeOrgId) {
        applyOrgThemeTokensUpdate(activeOrgId, target.tokens);
      }
      return { previous };
    },
    onSuccess: (_data, presetId) => {
      const list = queryClient.getQueryData<ThemePreset[]>(queryKey);
      const name = list?.find((p) => p.id === presetId)?.name ?? 'preset';
      toast.success(`Tema "${name}" ativado`);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error('Não foi possível ativar', {
        description: extractErrorDescription(err),
      });
    },
  });

  // ─── DEACTIVATE ─────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: () => themePresetsService.deactivate(),
    onMutate: async () => {
      const previous = queryClient.getQueryData<ThemePreset[]>(queryKey);
      queryClient.setQueryData<ThemePreset[]>(queryKey, (prev) =>
        prev?.map((p) => ({ ...p, isActive: false })),
      );
      if (activeOrgId) applyOrgThemeTokensUpdate(activeOrgId, null);
      return { previous };
    },
    onSuccess: () => {
      toast.success('Tema customizado desativado');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error('Não foi possível desativar', {
        description: extractErrorDescription(err),
      });
    },
  });

  // ─── API público ────────────────────────────────────────
  const create = useCallback(
    (payload: { name: string; tokens: ThemeTokens }) =>
      createMutation.mutateAsync(payload),
    [createMutation],
  );

  const update = useCallback(
    (presetId: string, payload: { name?: string; tokens?: ThemeTokens }) =>
      updateMutation.mutateAsync({ presetId, payload }),
    [updateMutation],
  );

  const remove = useCallback(
    async (presetId: string) => {
      await removeMutation.mutateAsync(presetId);
    },
    [removeMutation],
  );

  const activate = useCallback(
    async (presetId: string) => {
      await activateMutation.mutateAsync(presetId);
    },
    [activateMutation],
  );

  const deactivate = useCallback(async () => {
    await deactivateMutation.mutateAsync();
  }, [deactivateMutation]);

  return {
    presets,
    activePreset,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    create,
    isCreating: createMutation.isPending,
    update,
    isUpdating: updateMutation.isPending,
    remove,
    isRemoving: removeMutation.isPending,
    activate,
    isActivating: activateMutation.isPending,
    deactivate,
    isDeactivating: deactivateMutation.isPending,
  };
}
