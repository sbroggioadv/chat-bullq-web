'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  organizationService,
  type OrganizationProfile,
  type UpdateOrganizationProfilePayload,
} from '../services/organization.service';

/**
 * S19 Wave 1: leitura + escrita do perfil da org ativa (name/logoUrl).
 *
 * - Query: ['organization', 'current', activeOrgId]
 * - Mutation otimista: aplica patch no auth-store ANTES do request pra
 *   feedback imediato no sidebar (avatar + nome). Rollback em caso de erro.
 * - Sucesso: invalida ['auth', 'me'] pra refetch em background (defesa em
 *   profundidade — garante que prox load da pagina vem com dados frescos).
 *
 * Pattern copiado de useOrgBrand (S18 Wave 1) — mesmo shape, mesmo lifecycle.
 */
export function useOrganizationProfile() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);
  const applyOrgProfileUpdate = useAuthStore((s) => s.applyOrgProfileUpdate);
  const queryClient = useQueryClient();

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const role = activeOrg?.role;
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const query = useQuery<OrganizationProfile>({
    queryKey: ['organization', 'current', activeOrgId],
    queryFn: () => organizationService.getCurrent(),
    enabled: Boolean(activeOrgId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateOrganizationProfilePayload) =>
      organizationService.updateProfile(payload),
    onMutate: async (payload) => {
      if (!activeOrgId) return { previous: undefined };
      const previous = {
        name: activeOrg?.name,
        logoUrl: activeOrg?.logoUrl ?? null,
      };
      applyOrgProfileUpdate(activeOrgId, payload);
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      // Rollback otimista do auth-store
      if (activeOrgId && ctx?.previous) {
        applyOrgProfileUpdate(activeOrgId, ctx.previous);
      }
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error('Nao foi possivel salvar as alteracoes', { description: msg });
    },
    onSuccess: (data) => {
      toast.success('Alteracoes salvas');
      // Atualiza cache da query + invalida /auth/me em background
      queryClient.setQueryData(['organization', 'current', activeOrgId], data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    role,
    canEdit,
  };
}
