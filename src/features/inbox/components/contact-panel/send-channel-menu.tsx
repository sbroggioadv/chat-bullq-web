'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { conversationActionsService, type SendChannel } from '@/features/inbox/services/conversation-actions.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';
import { EmailCompose } from '@/features/email/components/email-compose';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function SendChannelMenu(props: { conversationId: string; channelName?: string; disabled?: boolean; children?: ReactNode; draftText?: string; onNavigate?: (id: string) => void }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  const userId = useAuthStore(s => s.user?.id);
  return <ChannelMenu key={`${userId}:${orgId}:${props.conversationId}`} {...props} />;
}
function ChannelMenu({ conversationId, channelName, disabled, children, draftText = '', onNavigate }: { conversationId: string; channelName?: string; disabled?: boolean; children?: ReactNode; draftText?: string; onNavigate?: (id: string) => void }) {
  const router = useRouter();
  const [pendingChannel, setPendingChannel] = useState<SendChannel | null>(null);
  const [email, setEmail] = useState<{ channelId: string; to: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<SendChannel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    live.current = true;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) { setPendingChannel(null); setOpen(false); } };
    document.addEventListener('pointerdown', outside);
    return () => { live.current = false; document.removeEventListener('pointerdown', outside); };
  }, []);
  useEffect(() => {
    if (open && !busy && !pendingChannel) container.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open, busy, pendingChannel]);
  useEffect(() => {
    if (pendingChannel) container.current?.querySelector<HTMLButtonElement>('[data-cancel-switch]')?.focus();
  }, [pendingChannel]);
  function selectChannel(channel: SendChannel) {
    if (draftText.trim()) setPendingChannel(channel);
    else void switchTo(channel);
  }
  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true); setBusy(true); setError(null); setChannels([]);
    try {
      const result = await conversationActionsService.sendChannels(conversationId);
      if (live.current) setChannels(result);
    } catch (err) {
      if (live.current) setError(inboxErrorMessage(err, 'Não foi possível listar os canais.'));
    } finally { if (live.current) setBusy(false); }
  }
  async function switchTo(channel: SendChannel) {
    if (!channel.available || channel.current || busy || disabled) return;
    setBusy(true); setError(null);
    try {
      const destination = await conversationActionsService.openChannel(conversationId, channel.channelId);
      if (!live.current) return;
      if (channel.type?.toUpperCase() === 'GMAIL') {
        const target = await inboxService.getConversation(destination.conversationId);
        if (!live.current) return;
        if (target.channelId !== channel.channelId || !target.contact.email) throw new Error('O canal de destino não tem e-mail válido para este contato.');
        setEmail({ channelId: channel.channelId, to: target.contact.email });
      } else if (onNavigate) onNavigate(destination.conversationId);
      else router.push(`/inbox?conversationId=${encodeURIComponent(destination.conversationId)}`);
      setOpen(false);
    } catch (err) { if (live.current) setError(inboxErrorMessage(err, 'Não foi possível abrir o canal.')); }
    finally { if (live.current) setBusy(false); }
  }
  return <div ref={container} className="relative min-w-0" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); setPendingChannel(null); setOpen(false); container.current?.querySelector('button')?.focus(); return; }
    if (pendingChannel || !open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(container.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }}>
    <button type="button" className="bq-button" aria-label="Opções de envio" aria-expanded={open} aria-haspopup="menu" onClick={toggle}><span className="bq-composer-via"><span>Enviar por {channelName || 'este canal'}</span>⌄</span></button>
    {email && <EmailCompose channelId={email.channelId} initialTo={email.to} onClose={() => setEmail(null)} onSent={() => {}} />}
    {pendingChannel && <div role="alertdialog" aria-label="Trocar de canal com rascunho" aria-describedby="channel-draft-warning" className="bq-popover absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[90vw] space-y-2 p-3 text-xs">
      <p id="channel-draft-warning">O rascunho fica salvo nesta conversa e não será enviado nem levado para o outro canal.</p>
      <button type="button" className="bq-button" data-cancel-switch onClick={() => { setPendingChannel(null); container.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus(); }}>Continuar nesta conversa</button>
      <button type="button" className="bq-button" onClick={() => { const channel = pendingChannel; setPendingChannel(null); void switchTo(channel); }}>Trocar de canal</button>
    </div>}
    {open && !pendingChannel && <div className="bq-popover absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[90vw] space-y-2 p-3 text-xs" role="menu" aria-label="Canais de envio">
      {busy && <p role="status">Carregando…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && channels.length === 0 && <p>Nenhum canal disponível.</p>}
      {channels.map(channel => <button type="button" role="menuitem" className="bq-button w-full flex-col items-start" key={channel.channelId} disabled={busy || disabled || channel.current || !channel.available} onClick={() => selectChannel(channel)}>
        <span>{channel.name}{channel.current ? ' · atual' : ''}</span>{channel.reason && <span className="text-[var(--bq-t3)]">{channel.reason}</span>}
      </button>)}
      {disabled && <p>Conclua o envio ou remova o anexo para trocar de canal.</p>}
      {children}
    </div>}
  </div>;
}
