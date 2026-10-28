'use client';

import { createContext, useContext, useSyncExternalStore, useState, type ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { PanelLeft, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { InboxTree } from '@/features/inbox-views/components/inbox-tree';
import { EmailTree } from '@/features/email/components/email-tree';
import { PipelinesTree } from '@/features/pipelines/components/pipelines-tree';
import { JarvisTree } from '@/features/ai-agents/components/jarvis-tree';
import { AppTopbar } from '@/components/layout/app-topbar';

const key = 'bullq2-rail-expanded';
const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};
const getSnapshot = () => { try { return localStorage.getItem(key) === 'true'; } catch { return false; } };
const RailContext = createContext({ expanded: false, toggle: () => {} });
export const useAppRail = () => useContext(RailContext);

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const expanded = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pathname = usePathname();
  const navigation = pathname === '/inbox' ? <InboxTree /> : pathname === '/email' ? <EmailTree /> : pathname.startsWith('/pipelines') ? <PipelinesTree /> : pathname.startsWith('/ai-agents') ? <JarvisTree /> : null;
  const toggle = () => {
    try { localStorage.setItem(key, String(!expanded)); } catch { /* Private browsing can deny storage. */ }
    window.dispatchEvent(new Event('storage'));
  };
  return (
    <RailContext.Provider value={{ expanded, toggle }}>
      <div className="bq-wall">
        <div className="bq-window" data-expanded={expanded}>
          {sidebar}
          <div className="bq-main">
            <AppTopbar navigationButton={navigation ? <button type="button" className="bq-icon" aria-label="Abrir navegação da seção" onClick={() => setNavigationOpen(true)}><PanelLeft size={18} /></button> : null} />
            <div className="bq-body">
              {navigation && <nav aria-label="Navegação da seção" className="bq-secondary">{navigation}</nav>}
              <main id="main-content" className="bq-content">{children}</main>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={navigationOpen} onClose={setNavigationOpen} className="relative z-50">
        <DialogBackdrop className="bq-scrim fixed inset-0" />
        <DialogPanel className="bq-drawer fixed inset-y-0 left-0 w-72 overflow-y-auto p-4">
          <div className="flex items-center justify-between"><DialogTitle>Navegação da seção</DialogTitle><button type="button" className="bq-icon" aria-label="Fechar navegação" onClick={() => setNavigationOpen(false)}><X size={18} /></button></div>
          <div onClick={(event) => { if ((event.target as HTMLElement).closest('a')) setNavigationOpen(false); }}>{navigation}</div>
        </DialogPanel>
      </Dialog>
    </RailContext.Provider>
  );
}
