'use client';

import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, Building2, Search, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel } from '@/components/ui/dropdown';

const titles: Record<string, string> = { inbox: 'Conversas', contacts: 'Contatos', pipelines: 'Pipelines', projects: 'Projetos', calendar: 'Agenda', email: 'E-mail', automations: 'Automações', 'ai-agents': 'Agentes', dashboard: 'Dashboard', settings: 'Configurações', chatbot: 'Chatbot' };
export function AppTopbar({ navigationButton }: { navigationButton?: ReactNode }) {
  const pathname = usePathname();
  const { organizations, activeOrgId, setActiveOrg } = useAuthStore();
  const org = organizations.find((item) => item.id === activeOrgId);
  return <header className="bq-toolbar">
    <div className="bq-mobile-nav">{navigationButton}</div>
    <Dropdown>
      <DropdownButton className="bq-org" aria-label="Selecionar organização">
        <Avatar src={org?.logoUrl ?? undefined} initials={org?.name?.slice(0, 2).toUpperCase() ?? 'BQ'} className="bq-org-mark" square />
        <span className="truncate max-w-40">{org?.name ?? 'Organização'}</span><ChevronsUpDown size={14} />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        {organizations.map((item) => <DropdownItem key={item.id} onClick={() => { if (item.id !== activeOrgId) { setActiveOrg(item.id); window.location.reload(); } }}><Building2 /><DropdownLabel>{item.name}</DropdownLabel></DropdownItem>)}
      </DropdownMenu>
    </Dropdown>
    <span className="bq-crumb" aria-hidden="true">/</span><strong className="truncate">{titles[pathname.split('/')[1]] ?? 'BullQ'}</strong>
    <div className="bq-search" title="Busca global ainda não conectada"><Search size={15} /><input type="search" aria-label="Busca global ainda não conectada" placeholder="Buscar conversa, contato ou processo" disabled /></div>
    <Link href="/settings/notifications" prefetch className="bq-icon bq-notifications" aria-label="Configurar notificações" title="Notificações"><Bell size={18} /></Link>
  </header>;
}
