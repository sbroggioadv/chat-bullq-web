'use client';
import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { Button, SettingRow } from '@/components/ui/foundation';
import { SettingsSaveBar } from '@/features/settings/components/settings-save-bar';
import styles from '@/features/settings/components/settings.module.css';
import { useUserProfile } from '@/features/user-profile/hooks/use-user-profile';
import { useAuthStore } from '@/stores/auth-store';

export function UserProfileForm() {
  const profile = useUserProfile();
  if (!profile.user) return <p role="alert">Sessão expirada. Faça login novamente para acessar seu perfil.</p>;
  return <ProfileEditor key={profile.user.id} profile={profile} />;
}
function ProfileEditor({ profile }: { profile: ReturnType<typeof useUserProfile> }) {
  const { user, save, isSaving } = profile;
  const [draft, setDraft] = useState<{ name?: string; avatarUrl?: string | null }>({});
  const logout = useAuthStore(state => state.logout);
  if (!user) return null;
  const name = draft.name ?? user.name;
  const avatar = draft.avatarUrl !== undefined ? draft.avatarUrl : user.avatarUrl;
  const dirty = name.trim() !== user.name || avatar !== user.avatarUrl;
  const error = name.trim().length < 2 ? 'Mínimo 2 caracteres' : name.trim().length > 120 ? 'Máximo 120 caracteres' : null;
  const handleSave = async () => {
    if (!dirty || error || isSaving) return;
    try { await save({ ...(name.trim() !== user.name ? { name: name.trim() } : {}), ...(avatar !== user.avatarUrl ? { avatarUrl: avatar } : {}) }); setDraft({}); } catch { /* O hook informa o erro e restaura o usuário. */ }
  };
  return <div className="space-y-5">
    <section className={styles.block} aria-label="Dados do perfil">
      <div className={`border-b border-[var(--bq-hair)] p-4 ${styles.avatarUpload}`}><ImageUpload value={avatar} onChange={avatarUrl => setDraft(current => ({ ...current, avatarUrl }))} shape="circle" placeholderIcon={UserCircle} label="Foto de perfil" description="PNG, JPG ou WebP, até 5 MB." /></div>
      <SettingRow title="Nome" description="Como você aparece para a equipe."><div className="w-full sm:w-64"><input aria-label="Nome completo" aria-invalid={Boolean(error)} aria-describedby="profile-name-help" value={name} maxLength={120} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} className="w-full border px-3 py-2" /><p id="profile-name-help" className="mt-1 text-xs text-[var(--bq-t3)]">{error ?? `${name.length}/120 caracteres`}</p></div></SettingRow>
      <SettingRow title="E-mail" description="Alterações exigem verificação pelo suporte."><span className="break-all text-[var(--bq-t2)]">{user.email}</span></SettingRow>
    </section>
    <section><h2 className={styles.sectionTitle}>Sessão</h2><div className={styles.block}><SettingRow title="Sair do BullQ" description="Volta para a tela de entrada."><Button onClick={logout}>Sair</Button></SettingRow></div></section>
    <SettingsSaveBar dirty={dirty} saving={isSaving} disabled={Boolean(error)} onSave={() => void handleSave()} onDiscard={() => setDraft({})} />
  </div>;
}
