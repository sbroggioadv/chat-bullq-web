import { create } from 'zustand';
import type { ThemeTokens } from '@/features/theme/types/brand';

export type OrgBrand = 'A' | 'B' | 'C';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  // 'ALL' for OWNER/ADMIN. Array of channel IDs for AGENT (deny-by-default).
  accessibleChannelIds: 'ALL' | string[];
  // Identidade visual da banca. null = onboarding wizard pendente (só OWNER vê).
  brand: OrgBrand | null;
  // Sprint S18 Wave 3: tokens customizados que sobrescrevem o brand.
  // null = sem custom (usa só brand). Não-null = override OKLCH.
  // Wave 4: passa a ser o CACHE do preset atualmente ativo (mesmo shape).
  themeTokens: ThemeTokens | null;
  // Sprint S18 Wave 4: ID do preset ativo na biblioteca. NULL = sem custom.
  // Lista de presets vive em react-query (queryKey ['theme-presets', orgId]).
  activeThemePresetId: string | null;
  // Sprint S19 Wave 1: logo da organizacao (renderizado no org-switcher do sidebar).
  // null/undefined = sem logo, fallback pra initials. Backend `/auth/me` ainda
  // nao expoe este campo — quando vier undefined, tratamos como null.
  logoUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  organizations: OrgInfo[];
  activeOrgId: string | null;
  setAuth: (user: AuthUser, orgs: OrgInfo[]) => void;
  setActiveOrg: (orgId: string) => void;
  applyChannelPermissionUpdate: (channelId: string, granted: boolean) => void;
  applyOrgBrandUpdate: (orgId: string, brand: OrgBrand) => void;
  applyOrgThemeTokensUpdate: (orgId: string, themeTokens: ThemeTokens | null) => void;
  // Sprint S19 Wave 1: aplica patch parcial no perfil da org (name/logoUrl)
  // sem refetchar /auth/me. Sidebar consome direto.
  applyOrgProfileUpdate: (orgId: string, patch: { name?: string; logoUrl?: string | null }) => void;
  // Sprint S19 Wave 2: aplica patch parcial no perfil do usuario (name/avatarUrl).
  // Sidebar footer consome `user.avatarUrl` reativo — optimistic update aqui faz
  // o avatar trocar instantaneamente ao salvar em /settings/profile.
  applyUserProfileUpdate: (patch: { name?: string; avatarUrl?: string | null }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organizations: [],
  activeOrgId: typeof window !== 'undefined' ? localStorage.getItem('active_org_id') : null,

  setAuth: (user, organizations) => {
    const stored = localStorage.getItem('active_org_id');
    // Use stored org if it's still in the user's org list, otherwise pick first
    const validStored = stored && organizations.some((o) => o.id === stored) ? stored : null;
    const activeOrgId = validStored || organizations[0]?.id || null;
    if (activeOrgId) localStorage.setItem('active_org_id', activeOrgId);
    set({ user, organizations, activeOrgId });
  },

  setActiveOrg: (orgId) => {
    localStorage.setItem('active_org_id', orgId);
    set({ activeOrgId: orgId });
  },

  applyChannelPermissionUpdate: (channelId, granted) => {
    set((state) => ({
      organizations: state.organizations.map((org) => {
        if (org.id !== state.activeOrgId) return org;
        if (org.accessibleChannelIds === 'ALL') return org;
        const set = new Set(org.accessibleChannelIds);
        if (granted) set.add(channelId);
        else set.delete(channelId);
        return { ...org, accessibleChannelIds: [...set] };
      }),
    }));
  },

  applyOrgBrandUpdate: (orgId, brand) => {
    set((state) => ({
      organizations: state.organizations.map((org) =>
        org.id === orgId ? { ...org, brand } : org,
      ),
    }));
  },

  applyOrgThemeTokensUpdate: (orgId, themeTokens) => {
    set((state) => ({
      organizations: state.organizations.map((org) =>
        org.id === orgId ? { ...org, themeTokens } : org,
      ),
    }));
  },

  applyOrgProfileUpdate: (orgId, patch) => {
    set((state) => ({
      organizations: state.organizations.map((org) =>
        org.id === orgId
          ? {
              ...org,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
            }
          : org,
      ),
    }));
  },

  applyUserProfileUpdate: (patch) => {
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        },
      };
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_org_id');
    set({ user: null, organizations: [], activeOrgId: null });
    window.location.href = '/login';
  },
}));
