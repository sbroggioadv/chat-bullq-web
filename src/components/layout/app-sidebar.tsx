'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Inbox, MessageSquare, Users, Columns3, FolderKanban, CalendarDays, Mail, Zap, Bot, Network, LayoutDashboard, Settings, PanelLeftClose, LogOut, UserCircle, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { jarvisDeskService } from '@/features/ai-agents/services/jarvis-desk.service';
import { ThemeModeToggle } from '@/features/theme/components/theme-mode-toggle';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel, DropdownDivider } from '@/components/ui/dropdown';
import { useAppRail } from '@/components/layout/app-shell';

const items = [
  { href: '/inbox', label: 'Conversas', icon: MessageSquare },
  { href: '/settings/contacts', label: 'Contatos', icon: Users },
  { href: '/pipelines', label: 'Pipelines', icon: Columns3 },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/calendar', label: 'Agenda', icon: CalendarDays },
  { href: '/email', label: 'E-mail', icon: Mail },
  { href: '/automations', label: 'Automações', icon: Zap },
];
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const jarvisOpen = params.get('jarvis') === '1';
  const { expanded, toggle } = useAppRail();
  const { user, logout } = useAuthStore();
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
    <Link href="/inbox" prefetch className="bq-brand-row" aria-label="BullQ · Conversas"><span className="bq-brand">BQ</span><span className="bq-rail-label">BullQ</span></Link>
    <nav className="bq-rail-nav" aria-label="Telas">
      <button type="button" className="bq-rail-item" disabled aria-label="Incoming · piloto previsto na W2" title="Incoming · piloto previsto na W2"><Inbox size={18} /><span className="bq-rail-label">Incoming · em breve</span></button>
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch className="bq-rail-item" aria-label={label} title={label} aria-current={(pathname.startsWith(href) && !(href === '/inbox' && jarvisOpen)) ? 'page' : undefined}><Icon size={18} /><span className="bq-rail-label">{label}</span></Link>)}
      <button type="button" className="bq-rail-item" onClick={openJarvis} disabled={opening} aria-current={jarvisOpen ? 'page' : undefined} aria-label="Falar com o Jarvis" title="Falar com o Jarvis"><Bot size={18} /><span className="bq-rail-label">{opening ? 'Abrindo…' : 'Jarvis'}</span></button>
      <Link href="/ai-agents" prefetch className="bq-rail-item" aria-label="Agentes" title="Agentes" aria-current={pathname.startsWith('/ai-agents') ? 'page' : undefined}><Network size={18} /><span className="bq-rail-label">Agentes</span></Link>
      <Link href="/dashboard" prefetch className="bq-rail-item" aria-label="Dashboard" title="Dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}><LayoutDashboard size={18} /><span className="bq-rail-label">Dashboard</span></Link>
    </nav>
    <div className="bq-rail-footer">
      <button type="button" className="bq-rail-item bq-collapse" onClick={toggle} aria-label={expanded ? 'Recolher trilho' : 'Expandir trilho'} title={expanded ? 'Recolher trilho' : 'Expandir trilho'} aria-expanded={expanded}><PanelLeftClose size={18} /><span className="bq-rail-label">Recolher</span></button>
      <div className="bq-theme"><ThemeModeToggle variant="compact" /><span className="bq-rail-label">Tema</span></div>
      <Link href="/settings/general" prefetch className="bq-rail-item" aria-label="Configurações" title="Configurações" aria-current={pathname.startsWith('/settings') ? 'page' : undefined}><Settings size={18} /><span className="bq-rail-label">Configurações</span></Link>
      <Dropdown><DropdownButton className="bq-rail-item" aria-label="Abrir perfil" title="Perfil"><Avatar src={user?.avatarUrl} initials={user?.name?.slice(0,2).toUpperCase() ?? 'BQ'} className="bq-avatar" /><span className="bq-rail-label truncate">{user?.name ?? 'Perfil'}</span></DropdownButton><DropdownMenu anchor="top start"><DropdownItem href="/settings/profile"><UserCircle /><DropdownLabel>Meu perfil</DropdownLabel></DropdownItem><DropdownItem href="/settings/appearance"><Palette /><DropdownLabel>Aparência</DropdownLabel></DropdownItem><DropdownDivider /><DropdownItem onClick={logout}><LogOut /><DropdownLabel>Sair</DropdownLabel></DropdownItem></DropdownMenu></Dropdown>
    </div>
  </aside>;
}
