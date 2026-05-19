'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  userService,
  type UpdateUserProfilePayload,
  type UserProfile,
} from '../services/user.service';

/**
 * S19 Wave 2: escrita do perfil do usuario logado (name/avatarUrl).
 *
 * Diferenca pra useOrganizationProfile (Wave 1):
 *   - NAO precisa query GET — auth-store ja tem `user` populado por /auth/me
 *     no boot. Avatar do sidebar consome direto do store.
 *   - Sem RBAC — usuario sempre edita o proprio perfil.
 *
 * Mutation otimista: aplica patch no auth-store ANTES do request pra feedback
 * imediato no sidebar (avatar + nome). Rollback se backend falhar.
 *
 * Pattern espelhado do useOrganizationProfile pra manter consistencia.
 */
export function useUserProfile() {
  const user = useAuthStore((s) => s.user);
  const applyUserProfileUpdate = useAuthStore((s) => s.applyUserProfileUpdate);
  const queryClient = useQueryClient();

  const mutation = useMutation<UserProfile, Error, UpdateUserProfilePayload, { previous: { name: string; avatarUrl: string | null } | undefined }>({
    mutationFn: (payload) => userService.updateProfile(payload),
    onMutate: async (payload) => {
      if (!user) return { previous: undefined };
      const previous = { name: user.name, avatarUrl: user.avatarUrl };
      applyUserProfileUpdate(payload);
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      // Rollback otimista do auth-store
      if (ctx?.previous) {
        applyUserProfileUpdate(ctx.previous);
      }
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error('Nao foi possivel salvar o perfil', { description: msg });
    },
    onSuccess: () => {
      toast.success('Perfil atualizado');
      // Invalida /auth/me em background (defesa em profundidade — prox load
      // da pagina vem com dados frescos do backend, alinhando cache + store).
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    user,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
