'use client';

import { SynqSymbol } from '@/components/ui/synq-symbol';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { ShellIcon, type ShellIconName } from '@/components/layout/shell-icon';
import { Building2, Check, LogOut, UserCircle, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { jarvisDeskService } from '@/features/ai-agents/services/jarvis-desk.service';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel, DropdownDivider } from '@/components/ui/dropdown';
import { useAppRail } from '@/components/layout/app-shell';

const items: { href: string; label: string; icon: ShellIconName }[] = [
  { href: '/inbox', label: 'Conversas', icon: 'msg' },
  { href: '/settings/contacts', label: 'Contatos', icon: 'users' },
  { href: '/pipelines', label: 'Pipelines', icon: 'funnel' },
  { href: '/projects', label: 'Projetos', icon: 'folder' },
  { href: '/calendar', label: 'Agenda', icon: 'cal' },
  { href: '/email', label: 'E-mail', icon: 'mail' },
  { href: '/automations', label: 'Automações', icon: 'zap' },
];
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const jarvisOpen = params.get('jarvis') === '1';
  const { expanded, toggle } = useAppRail();
  const { user, logout, organizations, activeOrgId, setActiveOrg } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [opening, setOpening] = useState(false);
  const openJarvis = async () => {
    if (opening) return;
    setOpening(true);
    try { const desk = await jarvisDeskService.open(); router.push(`/inbox?conversationId=${desk.conversationId}&jarvis=1`); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não abriu o canal do Jarvis'); }
    finally { setOpening(false); }
  };
  return <aside className="bq-rail" aria-label="Menu principal">
    <a href="#main-content" className="bq-skip">Pular para o conteúdo</a>
    <Link href="/inbox" prefetch className="bq-brand-row" aria-label="Synq · Conversas"><span className="bq-brand"><SynqSymbol className="h-6 w-6" /></span><span className="bq-rail-label">Synq</span></Link>
    <nav className="bq-rail-nav" aria-label="Telas">
      <button type="button" className="bq-rail-item" disabled aria-label="Incoming · piloto previsto na W2" title="Incoming · piloto previsto na W2"><ShellIcon name="inbox" /><span className="bq-rail-label">Incoming · em breve</span></button>
      {items.map(({ href, label, icon }) => <Link key={href} href={href} prefetch className="bq-rail-item" aria-label={label} title={label} aria-current={(!pathname.startsWith('/settings') && pathname.startsWith(href) && !(href === '/inbox' && jarvisOpen)) ? 'page' : undefined}><ShellIcon name={icon} /><span className="bq-rail-label">{label}</span></Link>)}
      <button type="button" className="bq-rail-item" onClick={openJarvis} disabled={opening} aria-current={pathname === '/inbox' && jarvisOpen ? 'page' : undefined} aria-label="Falar com o Jarvis" title="Falar com o Jarvis"><ShellIcon name="spark" /><span className="bq-rail-label">{opening ? 'Abrindo…' : 'Jarvis'}</span></button>
      <Link href="/ai-agents" prefetch className="bq-rail-item" aria-label="Agentes" title="Agentes" aria-current={pathname.startsWith('/ai-agents') ? 'page' : undefined}><ShellIcon name="bot" /><span className="bq-rail-label">Agentes</span></Link>
      <Link href="/dashboard" prefetch className="bq-rail-item" aria-label="Dashboard" title="Dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}><ShellIcon name="grid" /><span className="bq-rail-label">Dashboard</span></Link>
    </nav>
    <div className="bq-rail-footer">
      <button type="button" className="bq-rail-item bq-collapse" onClick={toggle} aria-label={expanded ? 'Recolher trilho' : 'Expandir trilho'} title={expanded ? 'Recolher trilho' : 'Expandir trilho'} aria-expanded={expanded}><ShellIcon name="chevs" /><span className="bq-rail-label">Recolher</span></button>
      <button type="button" className="bq-rail-item" aria-label={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} title="Tema claro ou escuro" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}><ShellIcon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} /><span className="bq-rail-label">Tema</span></button>
      <Link href="/settings/general" prefetch className="bq-rail-item" aria-label="Configurações" title="Configurações" aria-current={pathname.startsWith('/settings') ? 'page' : undefined}><ShellIcon name="gear" /><span className="bq-rail-label">Configurações</span></Link>
      <Dropdown><DropdownButton className="bq-rail-item" aria-label="Abrir perfil" title="Perfil"><Avatar src={user?.avatarUrl} initials={user?.name?.slice(0,2).toUpperCase() ?? 'BQ'} className="bq-avatar" /><span className="bq-rail-label truncate">{user?.name ?? 'Perfil'}</span></DropdownButton><DropdownMenu anchor="top start"><DropdownLabel>Organizações</DropdownLabel>{organizations.map((org) => <DropdownItem key={org.id} onClick={() => { if (org.id !== activeOrgId) { setActiveOrg(org.id); window.location.reload(); } }}>{org.id === activeOrgId ? <Check /> : <Building2 />}<DropdownLabel>{org.name}{org.id === activeOrgId ? ' · atual' : ''}</DropdownLabel></DropdownItem>)}<DropdownDivider /><DropdownItem href="/settings/profile"><UserCircle /><DropdownLabel>Meu perfil</DropdownLabel></DropdownItem><DropdownItem href="/settings/appearance"><Palette /><DropdownLabel>Aparência</DropdownLabel></DropdownItem><DropdownDivider /><DropdownItem onClick={logout}><LogOut /><DropdownLabel>Sair</DropdownLabel></DropdownItem></DropdownMenu></Dropdown>
    </div>
  </aside>;
}
