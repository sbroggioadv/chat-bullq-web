'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, BotOff, Sparkles, Check, Play } from 'lucide-react';
import type { Conversation } from '@/features/inbox/services/inbox.service';

type AiOverride = boolean | null;

interface Props {
  conversation: Conversation;
  disabled?: boolean;
  inline?: boolean;
  onChange: (next: AiOverride) => void | Promise<void>;
  onEngage: () => void | Promise<void>;
}

const OPTIONS: Array<{
  value: AiOverride;
  label: string;
  hint: string;
  icon: React.ElementType;
  badgeCls: string;
  iconCls: string;
}> = [
  {
    value: null,
    label: 'Padrão',
    hint: 'Segue config geral, horário e canal',
    icon: Bot,
    badgeCls:
      'bg-[var(--bq-raised)] text-[var(--bq-t2)] hover:bg-[var(--bq-raised-2)]   ',
    iconCls: 'text-[var(--bq-t2)]',
  },
  {
    value: true,
    label: 'IA forçada',
    hint: 'Sobrepõe kill switch e horário — IA responde mesmo se geral estiver off',
    icon: Sparkles,
    badgeCls:
      'bg-[var(--bq-ok-soft)] text-[var(--bq-ok)] hover:bg-[var(--bq-ok-soft)]   ',
    iconCls: 'text-[var(--bq-ok)] ',
  },
  {
    value: false,
    label: 'IA pausada',
    hint: 'Sobrepõe global — IA NÃO responde nesta conversa',
    icon: BotOff,
    badgeCls:
      'bg-[var(--bq-warn-soft)] text-[var(--bq-warn)] hover:bg-[var(--bq-warn-soft)]   ',
    iconCls: 'text-[var(--bq-warn)] ',
  },
];

export function ConversationAiToggle({
  conversation,
  disabled,
  onChange,
  onEngage,
  inline = false,
}: Props) {
  const current =
    conversation.aiEnabled === undefined ? null : (conversation.aiEnabled as AiOverride);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const meta = OPTIONS.find((o) => o.value === current) ?? OPTIONS[0];
  const Icon = meta.icon;

  return (
    <div ref={ref} className="relative">
      {!inline && <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        disabled={disabled}
        title={meta.hint}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${meta.badgeCls}`}
      >
        <Icon className={`h-3.5 w-3.5 ${meta.iconCls}`} />
        {meta.label}
      </button>}

      {(inline || open) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={inline ? "space-y-1" : "bq-popover absolute right-0 top-full z-30 mt-1 w-80"}
        >
          <div className="border-b border-[var(--bq-hair)] px-3 py-2 ">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--bq-t2)]">
              IA nesta conversa
            </p>
          </div>
          {OPTIONS.map((opt) => {
            const isActive = opt.value === current;
            const OptIcon = opt.icon;
            return (
              <button
                key={String(opt.value)}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
                disabled={disabled}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bq-surface)]  ${
                  isActive ? 'bg-[var(--bq-surface)] ' : ''
                }`}
              >
                <OptIcon className={`mt-0.5 h-4 w-4 shrink-0 ${opt.iconCls}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--bq-t1)] ">
                      {opt.label}
                    </span>
                    {isActive && <Check className="h-3 w-3 text-[var(--bq-ok)]" />}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight text-[var(--bq-t2)]">
                    {opt.hint}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="border-t border-[var(--bq-hair)] " />
          <button
            onClick={() => {
              setOpen(false);
              onEngage();
            }}
            disabled={disabled || current === false}
            title={
              current === false
                ? 'A IA está pausada nesta conversa. Reative antes de engajar.'
                : 'Faz a IA ler o histórico e responder agora, sem esperar nova mensagem do cliente.'
            }
            className="flex w-full items-start gap-3 bg-primary/5 px-3 py-2.5 text-left text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary/10 dark:hover:bg-primary/20"
          >
            <Play className="mt-0.5 h-4 w-4 shrink-0 fill-current" />
            <div className="flex-1">
              <p className="font-medium">Engajar IA agora</p>
              <p className="mt-0.5 text-[11px] leading-tight opacity-80">
                Lê o histórico, entende o contexto e responde imediatamente.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
