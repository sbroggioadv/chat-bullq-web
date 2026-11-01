'use client';
import { useState } from 'react';
import { profileInitials } from '@/features/settings/components/settings-navigation';
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
      <div className={styles.photoRow}>
        <div className={styles.photoText}><h2>Foto de perfil</h2><p>PNG, JPG ou WebP, até 5 MB.</p></div>
        <div className={styles.avatarUpload} data-has-image={Boolean(avatar)}><ImageUpload value={avatar} onChange={avatarUrl => setDraft(current => ({ ...current, avatarUrl }))} shape="circle" placeholderIcon={() => <span className={styles.photoInitials} aria-hidden>{profileInitials(name)}</span>} /></div>
      </div>
      <div className={styles.fieldRow}><SettingRow title="Nome completo"><div className={styles.fieldControl}><input aria-label="Nome completo" aria-invalid={Boolean(error)} aria-describedby="profile-name-help" value={name} maxLength={120} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /><p id="profile-name-help" className={error ? styles.fieldError : 'sr-only'}>{error ?? `${name.length}/120 caracteres`}</p></div></SettingRow></div>
      <div className={styles.fieldRow}><SettingRow title="E-mail" description="Trocar o e-mail exige verificação. Fale com o suporte."><input aria-label="E-mail" type="email" value={user.email} readOnly /></SettingRow></div>
    </section>
    <section><h2 className={styles.sectionTitle}>Sessão</h2><div className={styles.block}><SettingRow title="Sair do Synq" description="Volta para a tela de entrada."><Button className={styles.danger} onClick={logout}>Sair</Button></SettingRow></div></section>
    <SettingsSaveBar dirty={dirty} saving={isSaving} disabled={Boolean(error)} onSave={() => void handleSave()} onDiscard={() => setDraft({})} />
  </div>;
}
