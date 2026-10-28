'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Search, Settings } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/foundation';
import { profileInitials } from '@/features/settings/components/settings-navigation';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { settingsGroups, settingsItems, normalizeSearch } from '@/features/settings/components/settings-navigation';
import styles from '@/features/settings/components/settings.module.css';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const user = useAuthStore(state => state.user);
  const orgId = useAuthStore(state => state.activeOrgId);
  const org = useAuthStore(state => state.organizations.find(item => item.id === state.activeOrgId));
  const selected = settingsItems.find(item => pathname === `/settings/${item.id}` || pathname.startsWith(`/settings/${item.id}/`));
  const Icon = selected?.icon ?? Settings;
  const search = normalizeSearch(query);
  const groups = settingsGroups.map(group => ({ ...group, items: group.items.filter(item => normalizeSearch(`${group.label} ${item.label} ${item.keywords}`).includes(search)) })).filter(group => group.items.length);
  return <div className={styles.settings} data-panel={Boolean(selected)}>
    <nav className={styles.nav} aria-label="Seções das configurações">
      <Link className={styles.me} title={org?.name} data-active={selected?.id === 'profile'} href="/settings/profile">
        <Avatar src={user?.avatarUrl} initials={profileInitials(user?.name)} className={styles.profileAvatar} />
        <span><strong>{user?.name ?? 'Seu perfil'}</strong><small>Perfil, sessão e e-mail</small></span>
      </Link>
      <label className={styles.search}><Search size={14} /><input aria-label="Buscar nas configurações" placeholder="Buscar nas configurações" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className={styles.groups}>
        {groups.map(group => <section key={group.label} aria-label={group.label}>
          <h2>{group.label}</h2>
          {group.items.map(item => <Link key={item.id} prefetch href={`/settings/${item.id}`} aria-current={selected?.id === item.id ? 'page' : undefined} className={styles.item}>
            <span className={styles.tile} data-tone={item.id}><item.icon size={13} /></span><span>{item.label}</span>
          </Link>)}
        </section>)}
        {!groups.length && <p className={styles.empty} role="status">Nenhuma configuração encontrada.</p>}
      </div>
    </nav>
    <div className={styles.main}>
      <div className={styles.inner}>
        <Link href="/settings/sections" className={`bq-button ${styles.back}`}><ArrowLeft size={14} />Configurações</Link>
        <div className={styles.heading}><span className={`${styles.tile} ${styles.large}`} data-tone={selected?.id ?? 'neutral'}><Icon size={22} /></span><div><h1>{selected?.label ?? 'Configurações'}</h1><p>{selected?.description ?? 'Escolha uma seção para começar.'}</p></div><span id="settings-heading-actions" className={styles.headingActions} /></div>
        <div className={styles.content} data-section={selected?.id} key={`${orgId}:${pathname}`}>
          {selected?.id === 'tags' && <p className="mb-4 text-xs text-[var(--bq-t3)]">Contagem de conversas por tag ainda não disponível.</p>}
          <Suspense key={`${orgId}:${pathname}`} fallback={<PageSkeleton />}>{children}</Suspense>
        </div>
      </div>
      <div id="settings-save-host" className={styles.saveHost} />
    </div>
  </div>;
}
