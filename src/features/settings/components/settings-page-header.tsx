import { Settings } from 'lucide-react';
import { settingsItems } from '@/features/settings/components/settings-navigation';
import styles from '@/features/settings/components/settings.module.css';

export const SETTINGS_PAGE_HEADER_FALLBACK = {
  label: 'Configurações',
  description: 'Escolha uma seção para começar.',
} as const;

export function SettingsPageHeader({ pathname }: { pathname: string }) {
  const selected = settingsItems.find(item => pathname === `/settings/${item.id}` || pathname.startsWith(`/settings/${item.id}/`));
  const Icon = selected?.icon ?? Settings;

  return <div className={styles.heading}>
    <span className={`${styles.tile} ${styles.large}`} data-tone={selected?.id ?? 'neutral'}><Icon size={22} /></span>
    <div><h1>{selected?.label ?? SETTINGS_PAGE_HEADER_FALLBACK.label}</h1><p>{selected?.description ?? SETTINGS_PAGE_HEADER_FALLBACK.description}</p></div>
    <span id="settings-heading-actions" className={styles.headingActions} />
  </div>;
}
