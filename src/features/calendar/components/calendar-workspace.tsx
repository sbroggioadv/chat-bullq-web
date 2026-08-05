'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calendarService,
  type CalendarEvent,
  type GoogleCalendarRef,
} from '../services/calendar.service';
import { channelsService } from '@/features/channels/services/channels.service';

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || '').replace('#', '').trim();
  if (raw.length !== 3 && raw.length !== 6) return `rgba(84,132,237,${alpha})`;
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(84,132,237,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type Draft = {
  mode: 'create' | 'edit';
  summary: string;
  attendees: string;
  withMeet: boolean;
  startLocal: string;
  endLocal: string;
  calendarId: string;
  eventId?: string;
  googleCalendarId?: string;
};

function defaultDraft(calendarId = 'primary'): Draft {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    mode: 'create',
    summary: '',
    attendees: '',
    withMeet: true,
    startLocal: toLocalInputValue(start),
    endLocal: toLocalInputValue(end),
    calendarId,
  };
}

export function CalendarWorkspace() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  );
  const from = weekDays[0].toISOString();
  const to = addDays(weekDays[6], 1).toISOString();

  const statusQ = useQuery({
    queryKey: ['calendar-status'],
    queryFn: () => calendarService.status(),
    staleTime: 30_000,
  });

  const calendarsQ = useQuery({
    queryKey: ['calendar-list', statusQ.data?.channelId],
    queryFn: () =>
      calendarService.calendars(statusQ.data?.channelId || undefined),
    enabled: !!statusQ.data?.connected && !statusQ.data?.needsReauthForCalendar,
    staleTime: 60_000,
  });

  const calendars: GoogleCalendarRef[] = calendarsQ.data?.calendars || [];

  useEffect(() => {
    const gmail = searchParams.get('gmail');
    if (!gmail) return;
    const cal = searchParams.get('calendar');
    if (gmail === 'connected') {
      if (cal === '0') {
        toast.error(
          'Google conectou, mas a Agenda não foi autorizada. Em Canais use Autorizar Agenda.',
        );
      } else {
        toast.success('Google conectado — carregando Agenda…');
      }
      qc.invalidateQueries({ queryKey: ['calendar-status'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      qc.invalidateQueries({ queryKey: ['calendar-list'] });
    } else if (gmail === 'error') {
      toast.error(searchParams.get('reason') || 'Falha na autorização Google');
    }
    router.replace('/calendar');
  }, [searchParams, qc, router]);

  const eventsQ = useQuery({
    queryKey: ['calendar-events', from, to, statusQ.data?.channelId],
    queryFn: () =>
      calendarService.events({
        channelId: statusQ.data?.channelId || undefined,
        from,
        to,
      }),
    enabled: !!statusQ.data?.connected && !statusQ.data?.needsReauthForCalendar,
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of weekDays) map.set(d.toISOString().slice(0, 10), []);
    for (const ev of eventsQ.data?.events || []) {
      if (!ev.start) continue;
      const key = new Date(ev.start).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventsQ.data, weekDays]);

  const primaryCalId =
    calendars.find((c) => c.primary)?.id || calendars[0]?.id || 'primary';

  const reauth = async () => {
    try {
      const { url } = await channelsService.gmailOAuthStart({
        channelId: statusQ.data?.channelId || undefined,
        name: 'Gmail',
        returnTo: '/calendar',
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao reconectar Google');
    }
  };

  const openCreate = () => setDraft(defaultDraft(primaryCalId));

  const openEdit = (ev: CalendarEvent) => {
    const start = ev.start ? new Date(ev.start) : new Date();
    const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 3600_000);
    setDraft({
      mode: 'edit',
      summary: ev.summary || '',
      attendees: (ev.attendees || []).map((a) => a.email).join(', '),
      withMeet: !!ev.meetLink,
      startLocal: toLocalInputValue(start),
      endLocal: toLocalInputValue(end),
      calendarId: ev.calendarId || 'primary',
      eventId: ev.eventId || ev.id.split(':').slice(1).join(':') || ev.id,
      googleCalendarId: ev.calendarId || 'primary',
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.summary.trim()) {
      toast.error('Informe o título');
      return;
    }
    setSaving(true);
    try {
      const startIso = new Date(draft.startLocal).toISOString();
      const endIso = new Date(draft.endLocal).toISOString();
      const attendeeEmails = draft.attendees
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));

      if (draft.mode === 'create') {
        const res = await calendarService.create({
          channelId: statusQ.data?.channelId || undefined,
          calendarId: draft.calendarId || primaryCalId,
          summary: draft.summary.trim(),
          startIso,
          endIso,
          withMeet: draft.withMeet,
          attendeeEmails,
        });
        toast.success(
          res.meetLink
            ? 'Evento no Google · Meet pronto (gravação/transcrição no Meet)'
            : 'Evento criado no Google',
        );
      } else {
        if (!draft.eventId || !draft.googleCalendarId) {
          toast.error('Evento inválido');
          return;
        }
        await calendarService.update(draft.eventId, {
          channelId: statusQ.data?.channelId || undefined,
          calendarId: draft.googleCalendarId,
          summary: draft.summary.trim(),
          startIso,
          endIso,
          attendeeEmails,
          withMeet: draft.withMeet && true,
        });
        toast.success('Evento atualizado no Google');
      }
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft || draft.mode !== 'edit' || !draft.eventId || !draft.googleCalendarId)
      return;
    if (!confirm('Apagar este evento no Google? Convidados serão notificados.'))
      return;
    setDeleting(true);
    try {
      await calendarService.remove({
        eventId: draft.eventId,
        calendarId: draft.googleCalendarId,
        channelId: statusQ.data?.channelId || undefined,
      });
      toast.success('Evento apagado no Google');
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao apagar');
    } finally {
      setDeleting(false);
    }
  };

  if (statusQ.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!statusQ.data?.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-zinc-300" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Conecte o Google em <strong>Canais</strong> para usar a Agenda.
        </p>
      </div>
    );
  }

  if (statusQ.data.needsReauthForCalendar) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-amber-400" />
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">
          Autorize a Agenda em <strong>Canais → Autorizar Agenda</strong>.
        </p>
        <button
          type="button"
          onClick={reauth}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Autorizar Agenda
        </button>
      </div>
    );
  }

  if (eventsQ.isError) {
    const msg =
      eventsQ.error instanceof Error
        ? eventsQ.error.message
        : 'Falha ao carregar eventos';
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">{msg}</p>
        <button
          type="button"
          onClick={() => eventsQ.refetch()}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Agenda
        </h1>
        {statusQ.data.email && (
          <span className="text-xs text-zinc-400">{statusQ.data.email}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
          >
            ← Semana
          </button>
          <button
            type="button"
            onClick={() => setAnchor(startOfWeek(new Date()))}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
          >
            Semana →
          </button>
          <button
            type="button"
            onClick={() => eventsQ.refetch()}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${eventsQ.isFetching ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Evento
          </button>
        </div>
      </div>

      {draft && (
        <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {draft.mode === 'create' ? 'Novo evento (Google)' : 'Editar evento'}
            </p>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              placeholder="Título"
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <select
              value={draft.calendarId}
              disabled={draft.mode === 'edit'}
              onChange={(e) => setDraft({ ...draft, calendarId: e.target.value })}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {(calendars.length
                ? calendars
                : [{ id: 'primary', summary: 'Principal', backgroundColor: '#039be5', foregroundColor: '#fff' }]
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                  {c.primary ? ' (principal)' : ''}
                </option>
              ))}
            </select>
            <input
              value={draft.attendees}
              onChange={(e) => setDraft({ ...draft, attendees: e.target.value })}
              placeholder="Convidados (e-mails, vírgula)"
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={draft.withMeet}
                  onChange={(e) =>
                    setDraft({ ...draft, withMeet: e.target.checked })
                  }
                />
                Google Meet
              </label>
            </div>
            <input
              type="datetime-local"
              value={draft.startLocal}
              onChange={(e) => setDraft({ ...draft, startLocal: e.target.value })}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="datetime-local"
              value={draft.endLocal}
              onChange={(e) => setDraft({ ...draft, endLocal: e.target.value })}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Espelha no Google na hora. Gravação e transcrição do Meet: ligue no
            próprio Meet (ou política do Workspace) — a API não ativa isso no create.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {draft.mode === 'edit' && (
              <button
                type="button"
                disabled={deleting}
                onClick={remove}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Apagar
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {draft.mode === 'create' ? 'Criar no Google' : 'Salvar no Google'}
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-auto bg-zinc-200 md:grid-cols-7 dark:bg-zinc-800">
        {weekDays.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const list = eventsByDay.get(key) || [];
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div key={key} className="min-h-[220px] bg-white p-2 dark:bg-zinc-950">
              <div
                className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
                  isToday ? 'text-primary' : 'text-zinc-500'
                }`}
              >
                {fmtDay(day)}
              </div>
              <div className="space-y-1.5">
                {list.map((ev) => {
                  const solid = ev.backgroundColor || '#5484ed';
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="relative block w-full overflow-hidden rounded-md border border-zinc-200/80 bg-white px-2 py-1.5 pl-2.5 text-left text-[11px] shadow-sm transition hover:ring-1 hover:ring-primary/30 dark:border-white/10 dark:bg-zinc-900/80"
                      style={{
                        // fundo suave da cor do Google — texto sempre legível via zinc
                        backgroundColor: hexToRgba(solid, 0.18),
                      }}
                      title="Clique para editar"
                    >
                      <span
                        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-md"
                        style={{ backgroundColor: solid }}
                      />
                      <div className="flex items-start gap-1">
                        <div className="min-w-0 flex-1 font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                          {ev.summary}
                        </div>
                        <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
                      </div>
                      {ev.start && !ev.allDay && (
                        <div className="text-zinc-600 dark:text-zinc-400">
                          {new Date(ev.start).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {ev.end
                            ? ` – ${new Date(ev.end).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : ''}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        {ev.calendarSummary && (
                          <span
                            className="inline-flex max-w-[9rem] truncate rounded px-1 py-0.5 text-[10px] font-semibold text-zinc-800 dark:text-zinc-100"
                            style={{ backgroundColor: hexToRgba(solid, 0.4) }}
                          >
                            {ev.calendarSummary}
                          </span>
                        )}
                        {ev.meetLink && (
                          <a
                            href={ev.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 font-medium text-sky-700 hover:underline dark:text-sky-300"
                          >
                            <Video className="h-3 w-3" /> Meet
                          </a>
                        )}
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                          >
                            <ExternalLink className="h-3 w-3" /> Google
                          </a>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!list.length && (
                  <p className="text-[11px] text-zinc-300 dark:text-zinc-700">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
