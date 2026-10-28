'use client';

import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bot, ChevronDown, Search, Check, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  inboxService,
  type Conversation,
} from '@/features/inbox/services/inbox.service';
import {
  aiAgentsService,
  type AiAgent,
} from '@/features/ai-agents/services/ai-agents.service';

interface Props {
  conversation: Conversation;
  onChanged?: () => void;
  inline?: boolean;
}

const KIND_BADGE: Record<string, string> = {
  ORCHESTRATOR:
    'bg-[var(--bq-warn-soft)] text-[var(--bq-warn)]  ',
  WORKER: 'bg-[var(--bq-info-soft)] text-[var(--bq-info)]  ',
};

export function AgentPinPopover({ conversation, onChanged, inline = false }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiAgentsService.list(),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents
      .filter((a) => a.isActive)
      .filter((a) =>
        q
          ? a.name.toLowerCase().includes(q) ||
            (a.description ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [agents, search]);

  const currentAgent = useMemo(() => {
    if (!conversation.activeAgentId) return null;
    return agents.find((a) => a.id === conversation.activeAgentId) ?? null;
  }, [agents, conversation.activeAgentId]);

  const handlePin = async (agent: AiAgent, closeFn: () => void) => {
    setBusyId(agent.id);
    try {
      const result = await inboxService.setActiveAgent(
        conversation.id,
        agent.id,
      );
      if (result.engaged) {
        toast.success(`${agent.name} assumiu a conversa`);
      } else {
        toast.info(
          `${agent.name} marcado como ativo, mas não engajou (${result.reason})`,
        );
      }
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      onChanged?.();
      closeFn();
    } catch (err: unknown) {
      toast.error(inboxErrorMessage(err, 'Erro ao trocar agent'));
    } finally {
      setBusyId(null);
    }
  };

  const content = (close: () => void) => (
          <>
            <div className="px-2 py-1.5">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Quem responde essa conversa
              </p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--bq-t3)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar agente…"
                  className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] py-1 pl-7 pr-2 text-xs   "
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-[var(--bq-t3)]">
                  Nenhum agente
                </p>
              )}
              {filtered.map((a) => {
                const isCurrent = a.id === conversation.activeAgentId;
                const isPending = busyId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => handlePin(a, close)}
                    disabled={isPending || isCurrent}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                      isCurrent
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-[var(--bq-surface)] '
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bq-agent-soft)] ">
                      <Bot className="h-3.5 w-3.5 text-[var(--bq-agent)] " />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-[var(--bq-t1)] ">
                          {a.name}
                        </p>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase ${
                            KIND_BADGE[a.kind] ?? KIND_BADGE.WORKER
                          }`}
                        >
                          {a.kind === 'ORCHESTRATOR' ? 'orq' : 'wkr'}
                        </span>
                      </div>
                      {a.description && (
                        <p className="truncate text-[10px] text-[var(--bq-t2)]">
                          {a.description}
                        </p>
                      )}
                    </div>
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--bq-t3)]" />
                    ) : isCurrent ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
  );
  if (inline) return content(() => undefined);
  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bq-agent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-agent)] hover:bg-[var(--bq-agent-soft)]   ">
        <Sparkles className="h-3.5 w-3.5" />
        {currentAgent ? (
          <span className="max-w-[120px] truncate">{currentAgent.name}</span>
        ) : (
          <span>IA</span>
        )}
        <ChevronDown className="h-3 w-3 text-[var(--bq-agent)]" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-72 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0   [--anchor-gap:0.25rem]"
      >
        {({ close }) => content(close)}
      </PopoverPanel>
    </Popover>
  );
}
