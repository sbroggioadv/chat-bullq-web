import { api } from '@/lib/api';

/**
 * S19 Wave 2: payload aceito por PATCH /users/me. Backend (UsersController +
 * UpdateProfileDto) aceita ambos como opcionais — passamos so o que mudou pra
 * evitar overwrite acidental.
 */
export interface UpdateUserProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

/**
 * S19 Wave 2: shape devolvido por PATCH /users/me. Backend retorna o registro
 * completo da tabela `users` — listamos aqui apenas os campos consumidos pela
 * aba Perfil + auth-store (id/name/email/avatarUrl). Demais campos (createdAt,
 * preferences, etc.) sao gerenciados em outros lugares.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export const userService = {
  /**
   * Atualiza name e/ou avatarUrl do usuario atual. NAO precisa de RBAC — todo
   * usuario edita o proprio perfil. Backend ja resolve `userId` via JWT
   * (@CurrentUser('id')) — frontend nao envia ID.
   *
   * Reusa o mesmo endpoint de upload de imagem da Wave 1 (ImageUpload usa
   * inboxService.uploadImage internamente, que bate em POST /messages/uploads/image).
   */
  async updateProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
    const { data } = await api.patch<{ data: UserProfile }>('/users/me', payload);
    return data.data;
  },
};
