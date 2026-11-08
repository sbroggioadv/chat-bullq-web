'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { conversationActionsService, type SendChannel } from '@/features/inbox/services/conversation-actions.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';
import { EmailCompose } from '@/features/email/components/email-compose';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { useAuthStore } from '@/stores/auth-store';

export function SendChannelMenu(props: { conversationId: string; channelName?: string; disabled?: boolean; children?: ReactNode; onNavigate?: (id: string) => void }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  return <ChannelMenu key={`${orgId}:${props.conversationId}`} {...props} />;
}
function ChannelMenu({ conversationId, channelName, disabled, children, onNavigate }: { conversationId: string; channelName?: string; disabled?: boolean; children?: ReactNode; onNavigate?: (id: string) => void }) {
  const [email, setEmail] = useState<{ channelId: string; to: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<SendChannel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    live.current = true;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => { live.current = false; document.removeEventListener('pointerdown', outside); };
  }, []);
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
      else window.location.assign(`/inbox?conversationId=${encodeURIComponent(destination.conversationId)}`);
      setOpen(false);
    } catch (err) { if (live.current) setError(inboxErrorMessage(err, 'Não foi possível abrir o canal.')); }
    finally { if (live.current) setBusy(false); }
  }
  return <div ref={container} className="relative" onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); container.current?.querySelector('button')?.focus(); } }}>
    <button type="button" className="bq-button" aria-label="Opções de envio" aria-expanded={open} aria-haspopup="menu" onClick={toggle}><span className="bq-composer-via"><span>Enviar por {channelName || 'este canal'}</span>⌄</span></button>
    {email && <EmailCompose channelId={email.channelId} initialTo={email.to} onClose={() => setEmail(null)} onSent={() => {}} />}
    {open && <div className="bq-popover absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[90vw] space-y-2 p-3 text-xs" role="menu" aria-label="Canais de envio">
      {busy && <p role="status">Carregando…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && channels.length === 0 && <p>Nenhum canal disponível.</p>}
      {channels.map(channel => <button type="button" role="menuitem" className="bq-button w-full flex-col items-start" key={channel.channelId} disabled={busy || disabled || channel.current || !channel.available} onClick={() => switchTo(channel)}>
        <span>{channel.name}{channel.current ? ' · atual' : ''}</span>{channel.reason && <span className="text-[var(--bq-t3)]">{channel.reason}</span>}
      </button>)}
      {disabled && <p>Conclua o envio ou remova o anexo para trocar de canal.</p>}
      {children}
    </div>}
  </div>;
}
