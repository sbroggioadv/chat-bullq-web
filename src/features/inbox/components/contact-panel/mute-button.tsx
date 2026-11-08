'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bell, BellOff } from 'lucide-react';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { conversationActionsService, type MuteMode } from '@/features/inbox/services/conversation-actions.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';
import { useAuthStore } from '@/stores/auth-store';

type MuteConversation = Conversation & { mutedUntil?: string | null };
const modes: [MuteMode, string][] = [['1h', '1 hora'], ['8h', '8 horas'], ['24h', '24 horas'], ['forever', 'Sempre'], ['off', 'Reativar notificações']];
export function MuteButton({ conversation }: { conversation: MuteConversation }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  return <MuteControl key={`${orgId}:${conversation.id}:${conversation.mutedUntil ?? ''}`} conversation={conversation} />;
}
function MuteControl({ conversation }: { conversation: MuteConversation }) {
  const qc = useQueryClient();
  const orgId = useAuthStore(s => s.activeOrgId);
  const [until, setUntil] = useState(conversation.mutedUntil ?? null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const muted = Boolean(until && Date.parse(until) > now);
  const mutation = useMutation({
    mutationFn: (mode: MuteMode) => conversationActionsService.mute(conversation.id, mode),
    onSuccess: result => {
      setUntil(result.mutedUntil);
      setNow(Date.now());
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
    },
  });
  const Icon = muted ? BellOff : Bell;
  return <div className="text-xs text-[var(--bq-t2)]">
    <Popover>
      <PopoverButton className="bq-button" disabled={mutation.isPending || orgId !== conversation.organizationId} aria-label={muted ? 'Alterar silêncio' : 'Silenciar conversa'}><Icon size={16} />{muted ? 'Silenciada' : 'Silenciar'}</PopoverButton>
      <PopoverPanel anchor="bottom end" className="bq-popover z-50 max-w-[90vw] p-2">
        {({ close }) => <div role="menu" aria-label="Silenciar conversa">{modes.map(([mode, label]) => <button type="button" role="menuitem" className="bq-button w-full" key={mode} disabled={mutation.isPending} onClick={() => { mutation.mutate(mode); close(); }}>{label}</button>)}</div>}
      </PopoverPanel>
    </Popover>
    {muted && <p role="status">{until?.startsWith('9999') ? 'Silenciada sempre' : `Silenciada até ${new Date(until!).toLocaleString('pt-BR')}`}</p>}
    {mutation.isError && <p role="alert">{inboxErrorMessage(mutation.error, 'Não foi possível alterar o silêncio.')}</p>}
  </div>;
}
