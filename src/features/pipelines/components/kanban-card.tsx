'use client';

import { formatMoney } from '@/features/pipelines/components/money';
import { Avatar } from '@/components/ui/avatar';
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
  WHATSAPP_ZAPPFY: 'var(--bq-ok)',
  WHATSAPP_OFFICIAL: 'var(--bq-ok)',
  INSTAGRAM: 'var(--bq-ig)',
};
const avatarTones = ['var(--bq-info)', 'var(--bq-agent)', 'var(--bq-ok)', 'var(--bq-warn)'];

export function KanbanCard({ card, onClick }: { card: CardSummary; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id, data: { type: 'card', card },
  });
  const contact = card.contact;
  const channel = card.conversation?.channel;
  const ChannelIcon = channelIconByType[channel?.type ?? ''] ?? MessageSquare;
  const contactName = contact?.name || contact?.phone || card.title;
  const initials = contactName.split(/\s+/).slice(0, 2).map(word => word[0]).join('');
  const tone = avatarTones[Array.from(contactName).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % avatarTones.length];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${card.title}`}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick?.(); } }}
      className="flex cursor-grab touch-none flex-col gap-[7px] rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-[11px] py-2.5 text-left active:cursor-grabbing hover:border-[var(--bq-hair-strong)] focus-visible:outline-2 focus-visible:outline-[var(--bq-accent)]"
    >
      <div className="flex min-w-0 items-center gap-2" data-card-header>
        {contact && <span className="relative shrink-0" data-contact-avatar>
          <span style={{ backgroundColor: `color-mix(in srgb, ${tone} 25%, var(--bq-raised))` }} className="inline-flex rounded-full">
            <Avatar className="!size-[30px] !bg-transparent !outline-none [&>span]:!text-[var(--bq-t1)]" src={contact.avatarUrl} initials={initials} />
          </span>
          {channel && <span title={channel.name} aria-label={`Canal: ${channel.name}`} style={{ backgroundColor: channelColorByType[channel.type] ?? 'var(--bq-info)' }} className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-[var(--bq-win-solid)] text-[var(--bq-on-accent)]"><ChannelIcon className="size-2.5" /></span>}
        </span>}
        <span title={card.assignedTo ? `Responsável: ${card.assignedTo.name}` : undefined} className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--bq-t1)]">{contactName}</span>
        {(card.conversation || card.conversationId) && <MessageSquare className="size-3 shrink-0 text-[var(--bq-t2)]" aria-label="Tem conversa vinculada" />}
      </div>
      {contact && <p className="text-[12.5px] text-[var(--bq-t1)]">{card.title}</p>}
      {card.description && <p className="line-clamp-2 text-xs text-[var(--bq-t3)]">{card.description}</p>}
      {card.closedReason && <p className="text-xs text-[var(--bq-t3)]">Motivo: {card.closedReason}</p>}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-medium text-[var(--bq-t3)]">
        <span className="mr-auto text-[var(--bq-t1)]">{formatMoney(card.value, card.currency) || '—'}</span>
        {!contact && channel && <span title={channel.name}><ChannelIcon className="size-3" /></span>}
      </div>
    </div>
  );
}
