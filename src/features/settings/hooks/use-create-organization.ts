'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  organizationService,
  type CreateOrganizationPayload,
  type OrganizationProfile,
} from '../services/organization.service';

/**
 * S19 Wave 3: criacao de novo workspace.
 *
 * Pattern diferente de useOrganizationProfile (Wave 1):
 *   - NAO faz optimistic update — criar org gera ID server-side, sem otimista
 *     viavel
 *   - Em onSuccess: adiciona org no auth-store + seta como ativa + RELOAD da
 *     pagina (window.location.href) pra recarregar contexto inteiro (channels,
 *     agentes, themePresets, etc.) com a nova org ativa
 *
 * O reload e necessario porque cada org tem dezenas de recursos isolados que
 * sao carregados no boot via /auth/me + queries especificas. Tentar migrar
 * todos os caches react-query manualmente seria fragil.
 */
export function useCreateOrganization() {
  const addOrganization = useAuthStore((s) => s.addOrganization);
  const setActiveOrg = useAuthStore((s) => s.setActiveOrg);

  const mutation = useMutation<OrganizationProfile, Error, CreateOrganizationPayload>({
    mutationFn: (payload) => organizationService.create(payload),
    onSuccess: (newOrg) => {
      // Adiciona ao store. Role/brand/themeTokens ainda nao vem da resposta
      // do POST — preenchemos com defaults sane. /auth/me na proxima vai
      // sobrescrever com dados frescos do backend.
      addOrganization({
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        role: 'OWNER',
        accessibleChannelIds: 'ALL',
        brand: null,
        themeTokens: null,
        activeThemePresetId: null,
        logoUrl: newOrg.logoUrl,
      });
      setActiveOrg(newOrg.id);
      toast.success(`Workspace "${newOrg.name}" criado`, {
        description: 'Recarregando para ativar o novo contexto…',
      });
      // Hard reload pra recarregar contexto inteiro (channels, agents, theme,
      // ai-credentials etc.) com nova org ativa. Delay curto pra usuario ver
      // o toast antes do reload.
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro ao criar workspace';
      toast.error('Nao foi possivel criar o workspace', { description: msg });
    },
  });

  return {
    create: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
}
