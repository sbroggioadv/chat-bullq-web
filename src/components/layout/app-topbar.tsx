'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useSocket } from '@/features/inbox/hooks/use-socket';
import { Avatar } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, Building2, Search, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel } from '@/components/ui/dropdown';

const subscribePlatform = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

const titles: Record<string, string> = { inbox: 'Conversas', contacts: 'Contatos', pipelines: 'Pipelines', projects: 'Projetos', calendar: 'Agenda', email: 'E-mail', automations: 'Automações', 'ai-agents': 'Agentes', dashboard: 'Dashboard', settings: 'Configurações', chatbot: 'Chatbot' };
export function AppTopbar({ navigationButton }: { navigationButton?: ReactNode }) {
  const pathname = usePathname();
  const isMac = useSyncExternalStore(subscribePlatform, isMacPlatform, () => false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { connected } = useSocket();
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k' && window.matchMedia('(min-width: 1121px)').matches) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  const { organizations, activeOrgId, setActiveOrg } = useAuthStore();
  const org = organizations.find((item) => item.id === activeOrgId);
  return <header className="bq-toolbar bq-app-toolbar">
    {navigationButton && <div className="bq-mobile-nav">{navigationButton}</div>}
    <div className="bq-crumbs">
    <Dropdown>
      <DropdownButton className="bq-org" aria-label="Selecionar organização">
        <Avatar src={org?.logoUrl ?? undefined} initials={org?.name?.slice(0, 2).toUpperCase() ?? 'BQ'} className="bq-org-mark" square />
        <span className="truncate max-w-40">{org?.name ?? 'Organização'}</span><ChevronsUpDown size={14} />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        {organizations.map((item) => <DropdownItem key={item.id} onClick={() => { if (item.id !== activeOrgId) { setActiveOrg(item.id); window.location.reload(); } }}><Building2 /><DropdownLabel>{item.name}</DropdownLabel></DropdownItem>)}
      </DropdownMenu>
    </Dropdown>
    <span className="bq-crumb" aria-hidden="true">/</span><strong className="bq-page-title">{titles[pathname.split('/')[1]] ?? 'BullQ'}</strong></div>
    <div className="bq-search" title="Busca global ainda não conectada"><Search size={15} /><input ref={searchRef} type="search" aria-label="Busca global ainda não conectada" aria-describedby="bq-search-help" aria-keyshortcuts="Control+k Meta+k" placeholder="Buscar conversa, contato ou processo" readOnly /><kbd aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</kbd><span id="bq-search-help" className="bq-search-help" role="status">Busca global ainda não conectada. Use as buscas de cada tela.</span></div>
    <span className="bq-live" data-connected={connected} role="status" aria-label={connected ? 'Ao vivo' : 'Sem conexão'} title={connected ? 'Conexão em tempo real confirmada pelo servidor' : 'Sem conexão em tempo real confirmada; aguardando conexão ou reconexão'}><i aria-hidden="true" /><span>{connected ? 'Ao vivo' : 'Sem conexão'}</span></span>
    <Link href="/settings/notifications" prefetch className="bq-icon bq-notifications" aria-label="Configurar notificações" title="Notificações"><Bell size={18} /></Link>
  </header>;
}
