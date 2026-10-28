'use client';

import { formatMoney } from '@/features/pipelines/components/money';
import { Avatar } from '@/components/ui/avatar';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MessageSquare } from 'lucide-react';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import type { CardSummary } from '@/features/pipelines/services/pipelines.service';

const channelIconByType: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

interface Props {
  card: CardSummary;
  onClick?: () => void;
}

export function KanbanCard({ card, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { type: 'card', card },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const value = formatMoney(card.value, card.currency);
  const contact = card.contact;
  const assignedTo = card.assignedTo;
  const isClosed = card.status !== 'OPEN';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${card.title}`}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick?.(); } }}
      className={`group relative cursor-pointer rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-[11px] py-2.5 transition-colors hover:border-[var(--bq-hair-strong)] focus-visible:outline-2 focus-visible:outline-[var(--bq-accent)] ${isClosed ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-1 top-1 cursor-grab text-[var(--bq-t3)] transition-opacity active:cursor-grabbing touch-none"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          {contact && <div className="mb-[7px] flex items-center gap-2 pr-1"><Avatar className="!size-[30px] shrink-0" src={contact.avatarUrl} initials={(contact.name || contact.phone || '?').slice(0, 2)} /><span className="truncate text-[12.5px] font-semibold text-[var(--bq-t1)]">{contact.name || contact.phone}</span></div>}
          <p className="text-[12.5px] text-[var(--bq-t1)]">
            {card.title}
          </p>
          {card.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--bq-t3)]">
              {card.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--bq-t3)]">
        {value && (
          <span className="font-mono text-[11px] font-medium text-[var(--bq-t1)]">
            {value}
          </span>
        )}
        {card.status === 'WON' && (
          <span className="rounded-full bg-[var(--bq-ok-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--bq-ok)]">
            ganho
          </span>
        )}
        {card.status === 'LOST' && (
          <span className="rounded-full bg-[var(--bq-err-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--bq-err)]">
            perdido
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--bq-t3)]">
        <span />
        <div className="flex shrink-0 items-center gap-1">
          {card.conversation?.channel && (() => {
            const ChannelIcon =
              channelIconByType[card.conversation.channel.type] ?? MessageSquare;
            return (
              <span
                title={`${card.conversation.channel.name} · clique pra abrir a conversa`}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bq-raised-2)]"
              >
                <ChannelIcon className="h-3 w-3 text-[var(--bq-t2)]" />
              </span>
            );
          })()}
          {!card.conversation && card.conversationId && (
            <MessageSquare
              className="h-3 w-3 text-[var(--bq-info)]"
              aria-label="Tem conversa vinculada"
            />
          )}
          {assignedTo && (
            <span
              title={assignedTo.name}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bq-agent-soft)] text-[9px] font-bold text-[var(--bq-agent-text)]"
            >
              {assignedTo.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
