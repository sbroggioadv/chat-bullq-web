'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Inbox,
  Mail,
  Send,
  Tag,
} from 'lucide-react';
import {
  emailService,
  folderIdToParam,
  paramToFolderId,
  type EmailFolder,
} from '../services/email.service';

const SYSTEM_ICON: Record<string, any> = {
  INBOX: Inbox,
  SENT: Send,
  SPAM: AlertOctagon,
};

const STORAGE_KEY = 'email-tree-expanded';

/**
 * Item "E-mail" da sidebar (SPEC-004 W1). Só aparece quando a org tem canal
 * GMAIL ativo acessível ao usuário — sem canal, some (empty state honesto
 * fica na página /email).
 */
export function EmailTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  });

  const { data: status } = useQuery({
    queryKey: ['email-status'],
    queryFn: () => emailService.status(),
    staleTime: 60000,
  });

  const channelId = status?.channels[0]?.id;

  const { data: foldersData } = useQuery({
    queryKey: ['email-folders', channelId],
    queryFn: () => emailService.folders(channelId!),
    enabled: !!channelId,
    staleTime: 60000,
  });

  if (!status?.connected) return null;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  };

  const isEmail = pathname === '/email' || pathname?.startsWith('/email');
  const activeFolderId = isEmail
    ? paramToFolderId(searchParams.get('folder'))
    : null;

  const goFolder = (folderId: string) =>
    router.push(`/email?folder=${encodeURIComponent(folderIdToParam(folderId))}`);

  const folders = foldersData?.folders ?? [];
  const systemFolders = folders.filter((f) => f.kind === 'system');
  const userLabels = folders.filter((f) => f.kind === 'user');

  const renderFolder = (f: EmailFolder) => {
    const Icon = f.kind === 'system' ? (SYSTEM_ICON[f.id] ?? Inbox) : Tag;
    const isActive = activeFolderId === f.id;
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => goFolder(f.id)}
        title={f.name}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
          isActive
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
        }`}
      >
        <Icon className="size-3.5 text-sidebar-foreground/50" />
        <span className="flex-1 truncate">{f.name}</span>
      </button>
    );
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          className="flex h-7 w-5 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => goFolder('INBOX')}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
            isEmail
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Mail className="size-5 text-red-600 dark:text-red-400" />
          <span className="flex-1">E-mail</span>
        </button>
      </div>

      {expanded && (
        <div className="ml-5 space-y-0.5 border-l border-sidebar-border pl-2">
          {systemFolders.map(renderFolder)}

          {userLabels.length > 0 && (
            <>
              <div className="px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
                Marcadores
              </div>
              {userLabels.map(renderFolder)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
