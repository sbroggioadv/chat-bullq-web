"use client";

import { AlertOctagon, Inbox, Mail, RefreshCw, Send, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  EmailChannel,
  EmailFolder,
} from "@/features/email/services/email.service";

const SYSTEM_ICON: Record<string, LucideIcon> = {
  INBOX: Inbox,
  SENT: Send,
  SPAM: AlertOctagon,
};

interface EmailFolderListProps {
  channels: EmailChannel[];
  activeChannelId: string;
  onChannelChange: (channelId: string) => void;
  folders: EmailFolder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Coluna 1 do /email — pastas sistema + marcadores da conta. */
export function EmailFolderList({
  channels,
  activeChannelId,
  onChannelChange,
  folders,
  activeFolderId,
  onSelectFolder,
  loading,
  error,
  onRetry,
}: EmailFolderListProps) {
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const systemFolders = folders.filter((f) => f.kind === "system");
  const userLabels = folders.filter((f) => f.kind === "user");

  const renderFolder = (f: EmailFolder) => {
    const Icon = f.kind === "system" ? (SYSTEM_ICON[f.id] ?? Inbox) : Tag;
    const isActive = activeFolderId === f.id;
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => onSelectFolder(f.id)}
        aria-current={isActive ? "page" : undefined}
        title={f.name}
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
          isActive
            ? "bg-[var(--bq-accent-soft)] font-medium text-[var(--bq-t1)]"
            : "text-[var(--bq-t2)] hover:bg-[var(--bq-raised)]  "
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isActive ? "text-[var(--bq-t1)]" : "text-[var(--bq-t3)] "
          }`}
        />
        <span className="flex-1 truncate">{f.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-[var(--bq-hair)] bg-[var(--bq-surface)]  ">
      <div className="border-b border-[var(--bq-hair)] px-3 py-3 ">
        <div className="flex items-center gap-2">
          <Mail className="h-4.5 w-4.5 shrink-0 text-[var(--bq-err)] " />
          <span className="text-sm font-semibold text-[var(--bq-t1)] ">
            E-mail
          </span>
        </div>
        {channels.length > 1 ? (
          <select
            value={activeChannelId}
            onChange={(e) => onChannelChange(e.target.value)}
            className="mt-2 w-full truncate rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2 py-1 text-xs text-[var(--bq-t2)] outline-none   "
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.email ?? c.name}
              </option>
            ))}
          </select>
        ) : (
          activeChannel && (
            <p className="mt-1 truncate text-xs text-[var(--bq-t3)] ">
              {activeChannel.email ?? activeChannel.name}
            </p>
          )
        )}
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {error ? (
          <div className="px-2 py-3 text-xs text-[var(--bq-t3)] ">
            <p>Não foi possível carregar as pastas.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--bq-hair)] px-2 py-1 text-xs text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]   "
            >
              <RefreshCw className="h-3 w-3" /> Tentar de novo
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-1.5 px-2 py-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-md bg-[var(--bq-raised)] "
              />
            ))}
          </div>
        ) : (
          <>
            {systemFolders.map(renderFolder)}
            {userLabels.length > 0 && (
              <>
                <div className="px-2.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide text-[var(--bq-t3)] ">
                  Marcadores
                </div>
                {userLabels.map(renderFolder)}
              </>
            )}
            {userLabels.length === 0 && (
              <p className="px-2.5 pt-3 text-[11px] text-[var(--bq-t3)] ">
                Sem marcadores nesta conta.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
