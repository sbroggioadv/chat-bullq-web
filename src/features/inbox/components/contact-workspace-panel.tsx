'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  FolderKanban,
  Loader2,
  Mail,
  Paperclip,
  Send,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation } from '../services/inbox.service';
import { ProjectPanel } from './project-panel';
import {
  emailService,
  fileToOutboundAttachment,
  MAX_OUTBOUND_ATTACHMENTS,
  MAX_OUTBOUND_ATTACHMENT_BYTES,
} from '@/features/email/services/email.service';
import { calendarService } from '@/features/calendar/services/calendar.service';
import { rememberRecipients } from '@/features/email/lib/recent-recipients';

type Tab = 'contact' | 'email' | 'agenda' | 'project';

interface ContactWorkspacePanelProps {
  conversation: Conversation;
  onClose: () => void;
}

/**
 * ADR-004 D6 — Contact Workspace: Contato | E-mail | Agenda | Projeto.
 * Substitui o painel só-projeto na inbox omnichannel.
 */
export function ContactWorkspacePanel({
  conversation,
  onClose,
}: ContactWorkspacePanelProps) {
  const isGroup = conversation.isGroup;
  const [tab, setTab] = useState<Tab>(isGroup ? 'project' : 'contact');

  const contact = conversation.contact;
  const contactEmail =
    contact.email ||
    (contact.phone && contact.phone.includes('@') ? contact.phone : '') ||
    '';

  const tabs: Array<{ id: Tab; label: string; icon: any; show: boolean }> = [
    { id: 'contact', label: 'Contato', icon: User, show: true },
    { id: 'email', label: 'E-mail', icon: Mail, show: true },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, show: true },
    { id: 'project', label: 'Projeto', icon: FolderKanban, show: isGroup },
  ];

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Contato
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'contact' && (
          <div className="space-y-3 p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Nome
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {contact.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Telefone
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {contact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                E-mail
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {contactEmail || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Canal
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {conversation.channel.name} · {conversation.channel.type}
              </p>
            </div>
            {conversation.channel.type === 'GMAIL' && (
              <a
                href={`/email?thread=${encodeURIComponent(
                  // external id when gmail
                  (conversation as any).externalConversationId || conversation.id,
                )}`}
                className="inline-flex text-xs font-medium text-primary hover:underline"
              >
                Abrir no E-mail →
              </a>
            )}
          </div>
        )}

        {tab === 'email' && (
          <EmailComposeTab
            defaultTo={contactEmail}
            contactName={contact.name || contact.phone || 'contato'}
          />
        )}

        {tab === 'agenda' && (
          <AgendaTab
            conversationId={conversation.id}
            defaultAttendee={contactEmail}
            contactName={contact.name || ''}
          />
        )}

        {tab === 'project' && isGroup && (
          <div className="h-full [&_aside]:w-full [&_aside]:border-0">
            <ProjectPanel conversationId={conversation.id} onClose={onClose} />
          </div>
        )}
      </div>
    </aside>
  );
}

function EmailComposeTab({
  defaultTo,
  contactName,
}: {
  defaultTo: string;
  contactName: string;
}) {
  const statusQ = useQuery({
    queryKey: ['email-status'],
    queryFn: () => emailService.status(),
    staleTime: 60_000,
  });
  const channelId = statusQ.data?.channels[0]?.id;
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const addPendingFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_OUTBOUND_ATTACHMENTS) {
          toast.error(`No máximo ${MAX_OUTBOUND_ATTACHMENTS} anexos`);
          break;
        }
        if (f.size > MAX_OUTBOUND_ATTACHMENT_BYTES) {
          toast.error(`"${f.name}" excede 8 MB`);
          continue;
        }
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const send = async () => {
    if (!channelId) {
      toast.error('Conecte um canal Gmail em Canais');
      return;
    }
    if (!to.includes('@') || !subject.trim() || !body.trim()) {
      toast.error('Preencha destinatário, assunto e corpo');
      return;
    }
    setSending(true);
    try {
      rememberRecipients(to);
      const attachments =
        pendingFiles.length > 0
          ? await Promise.all(pendingFiles.map((f) => fileToOutboundAttachment(f)))
          : undefined;
      await emailService.compose({
        channelId,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        attachments,
      });
      toast.success(`E-mail enviado para ${contactName}`);
      setBody('');
      setPendingFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  if (statusQ.isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!channelId) {
    return (
      <p className="p-4 text-xs text-zinc-500">
        Nenhum Gmail conectado. Vá em Canais → Conectar Gmail.
      </p>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Para"
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Assunto"
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        placeholder="Escreva o e-mail…"
        className="w-full resize-y rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${f.size}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <Paperclip className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addPendingFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || pendingFiles.length >= MAX_OUTBOUND_ATTACHMENTS}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <Paperclip className="h-3 w-3" />
          Anexar
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={send}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar e-mail
        </button>
      </div>
    </div>
  );
}

function AgendaTab({
  conversationId,
  defaultAttendee,
  contactName,
}: {
  conversationId: string;
  defaultAttendee: string;
  contactName: string;
}) {
  const queryClient = useQueryClient();
  const statusQ = useQuery({
    queryKey: ['calendar-status'],
    queryFn: () => calendarService.status(),
    staleTime: 60_000,
  });
  const calsQ = useQuery({
    queryKey: ['calendar-list', statusQ.data?.channelId],
    queryFn: () =>
      calendarService.calendars(statusQ.data?.channelId || undefined),
    enabled: !!statusQ.data?.connected && !statusQ.data?.needsReauthForCalendar,
    staleTime: 60_000,
  });
  const calendars = calsQ.data?.calendars || [];
  const defaultCal =
    calendars.find((c) => c.primary)?.id || calendars[0]?.id || 'primary';

  const [summary, setSummary] = useState(
    contactName ? `Reunião com ${contactName}` : 'Reunião',
  );
  const [minutes, setMinutes] = useState(30);
  const [withMeet, setWithMeet] = useState(true);
  const [calendarId, setCalendarId] = useState(defaultCal);
  const [creating, setCreating] = useState(false);
  const [lastMeet, setLastMeet] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCal) setCalendarId(defaultCal);
  }, [defaultCal]);

  const startDefault = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, []);

  const create = async () => {
    if (!statusQ.data?.connected) {
      toast.error('Conecte o Google em Canais');
      return;
    }
    if (statusQ.data.needsReauthForCalendar) {
      toast.error('Reconecte o Google autorizando a Agenda');
      return;
    }
    setCreating(true);
    try {
      const start = new Date(startDefault);
      const end = new Date(start.getTime() + minutes * 60_000);
      const res = await calendarService.createFromConversation({
        conversationId,
        channelId: statusQ.data.channelId || undefined,
        calendarId,
        summary: summary.trim() || 'Reunião',
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        withMeet,
        attendeeEmails: defaultAttendee.includes('@')
          ? [defaultAttendee]
          : [],
      });
      setLastMeet(res.meetLink || null);
      // Bolha SYSTEM na conversa (local) — não manda pro WhatsApp/IG
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(
        res.meetLink
          ? 'Agendado no Google · Meet na conversa (bolha do sistema)'
          : 'Agendado no Google · nota na conversa',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao agendar');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-zinc-500">
        Cria no Google (calendário escolhido) daqui a ~1h.
      </p>
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={calendarId}
        onChange={(e) => setCalendarId(e.target.value)}
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {(calendars.length
          ? calendars
          : [{ id: 'primary', summary: 'Principal', backgroundColor: '', foregroundColor: '' }]
        ).map((c) => (
          <option key={c.id} value={c.id}>
            {c.summary}
            {c.primary ? ' (principal)' : ''}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        {[15, 30, 45, 60].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            className={`rounded-md px-2 py-1 text-[11px] ${
              minutes === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {m}m
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={withMeet}
          onChange={(e) => setWithMeet(e.target.checked)}
        />
        Google Meet
      </label>
      <p className="text-[10px] leading-snug text-zinc-400">
        Gravação/transcrição: no Meet (ou admin Workspace). A API não liga isso
        no create.
      </p>
      {defaultAttendee ? (
        <p className="text-[11px] text-zinc-400">Convidado: {defaultAttendee}</p>
      ) : (
        <p className="text-[11px] text-amber-600">
          Contato sem e-mail — evento só na sua agenda.
        </p>
      )}
      {lastMeet && (
        <a
          href={lastMeet}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[11px] text-sky-500 hover:underline"
        >
          Abrir Meet →
        </a>
      )}
      <button
        type="button"
        disabled={creating}
        onClick={create}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Agendar no Google
      </button>
      <a
        href="/calendar"
        className="block text-center text-[11px] text-primary hover:underline"
      >
        Abrir Agenda completa →
      </a>
    </div>
  );
}
