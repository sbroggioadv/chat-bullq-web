import { create } from 'zustand';

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
}

interface AuthState {
  user: AuthUser | null;
  organizations: OrgInfo[];
  activeOrgId: string | null;
  setAuth: (user: AuthUser, orgs: OrgInfo[]) => void;
  setActiveOrg: (orgId: string) => void;
  applyChannelPermissionUpdate: (channelId: string, granted: boolean) => void;
  applyOrgBrandUpdate: (orgId: string, brand: OrgBrand) => void;
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

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_org_id');
    set({ user: null, organizations: [], activeOrgId: null });
    window.location.href = '/login';
  },
}));
