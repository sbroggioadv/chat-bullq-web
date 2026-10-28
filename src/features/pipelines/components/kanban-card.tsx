'use client';

import { formatMoney } from '@/features/pipelines/components/money';
import { Avatar } from '@/components/ui/avatar';
import { mockupAvatarHue } from '@/components/ui/avatar-hue';
import type { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare } from 'lucide-react';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import type { CardSummary } from '@/features/pipelines/services/pipelines.service';

const channelIconByType: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};
const channelColorByType: Record<string, string> = {
  WHATSAPP_ZAPPFY: 'var(--bq-wa)',
  WHATSAPP_OFFICIAL: 'var(--bq-wa)',
  INSTAGRAM: 'var(--bq-ig)',
};
export function KanbanCard({ card, onClick, overlay = false }: { card: CardSummary; onClick?: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: overlay ? `overlay-${card.id}` : card.id, disabled: overlay, data: { type: 'card', card },
  });
  const contact = card.contact;
  const channel = card.conversation?.channel;
  const ChannelIcon = channelIconByType[channel?.type ?? ''] ?? MessageSquare;
  const contactName = contact?.name || contact?.phone || card.title;
  const initials = contactName.split(/\s+/).slice(0, 2).map(word => word[0]).join('');

  return (
    <div
      ref={setNodeRef}
      {...(!overlay ? attributes : {})}
      {...(!overlay ? listeners : {})}
      data-pipeline-card={card.id}
      aria-hidden={overlay || undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      onClick={onClick}
      role={overlay ? undefined : 'button'}
      tabIndex={overlay ? undefined : 0}
      aria-label={`Abrir ${card.title}`}
      onKeyDown={overlay ? undefined : e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' && !isDragging) { e.preventDefault(); onClick?.(); }
        else listeners?.onKeyDown?.(e);
      }}
      className={`flex cursor-grab touch-none flex-col gap-bq-space-control rounded-bq-radius-menu border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-bq-space-panel py-bq-space-item text-left active:cursor-grabbing hover:border-[var(--bq-hair-strong)] focus-visible:outline-2 focus-visible:outline-[var(--bq-accent)] ${isDragging ? 'opacity-bq-dragging' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-2" data-card-header>
        {contact && <span className="relative shrink-0" data-contact-avatar>
          <span style={{ '--bq-avatar-hue': mockupAvatarHue(contactName) } as CSSProperties}>
            <Avatar className="bq-avatar-mockup bq-avatar-pipeline leading-[normal]" src={contact.avatarUrl} initials={initials} />
          </span>
          {channel && <span title={channel.name} aria-label={`Canal: ${channel.name}`} style={{ '--bq-channel-color': channelColorByType[channel.type] ?? 'var(--bq-mail)' } as CSSProperties} className="bq-channel-badge"><ChannelIcon /></span>}
        </span>}
        <span title={card.assignedTo ? `Responsável: ${card.assignedTo.name}` : undefined} className="min-w-0 flex-1 truncate text-bq-text-row font-semibold text-[var(--bq-t1)]">{contactName}</span>
        {(card.conversation || card.conversationId) && <MessageSquare className="size-3 shrink-0 text-[var(--bq-t2)]" aria-label="Tem conversa vinculada" />}
      </div>
      {contact && <p className="text-bq-text-row text-[var(--bq-t1)]">{card.title}</p>}
      {card.description && <p className="line-clamp-2 text-xs text-[var(--bq-t3)]">{card.description}</p>}
      {card.closedReason && <p className="text-xs text-[var(--bq-t3)]">Motivo: {card.closedReason}</p>}
      <div className="flex flex-wrap items-center gap-1.5 font-[family-name:var(--bq-f-mono)] leading-[normal] text-bq-text-metadata font-medium text-[var(--bq-t3)]">
        <span className="mr-auto text-[var(--bq-t1)]">{formatMoney(card.value, card.currency) || '—'}</span>
        {!contact && channel && <span title={channel.name}><ChannelIcon className="size-3" /></span>}
      </div>
    </div>
  );
}
