import { api } from '@/lib/api';
import type { ThemeTokens } from '@/features/theme/types/brand';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  inviteToken?: string;
}

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
  accessibleChannelIds: 'ALL' | string[];
  // Identidade visual: 'A' | 'B' | 'C' | null (wizard pendente).
  brand: 'A' | 'B' | 'C' | null;
  // Sprint S18 Wave 3: tokens customizados (override do brand). null = sem custom.
  // Wave 4: passa a ser o CACHE do preset atualmente ativo (zero mudança shape).
  themeTokens: ThemeTokens | null;
  // Sprint S18 Wave 4: ID do preset ativo na biblioteca (NULL = sem custom,
  // usa só brand base A/B/C). UI consulta isso pra exibir "Ativo" badge.
  activeThemePresetId: string | null;
}

interface AuthResponse {
  user: AuthUser;
  organizations: OrgInfo[];
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  user: AuthUser;
  organizations: OrgInfo[];
}

interface InvitationInfo {
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED';
  organization: { id: string; name: string; slug: string };
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/login', payload);
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/register', payload);
    return data.data;
  },

  async getMe(): Promise<MeResponse> {
    const { data } = await api.get<{ data: MeResponse }>('/auth/me');
    return data.data;
  },

  async validateInvitation(token: string): Promise<InvitationInfo> {
    const { data } = await api.get<{ data: InvitationInfo }>(`/organizations/invitations/validate?token=${token}`);
    return data.data;
  },
};
