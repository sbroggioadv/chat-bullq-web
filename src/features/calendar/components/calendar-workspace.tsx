'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Video,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { calendarService } from '../services/calendar.service';
import { channelsService } from '@/features/channels/services/channels.service';

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 sun
  const diff = day === 0 ? -6 : 1 - day; // monday start
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

export function CalendarWorkspace() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [showCreate, setShowCreate] = useState(false);
  const [summary, setSummary] = useState('');
  const [attendees, setAttendees] = useState('');
  const [withMeet, setWithMeet] = useState(true);
  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInputValue(d);
  });
  const [endLocal, setEndLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return toLocalInputValue(d);
  });
  const [creating, setCreating] = useState(false);

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

  // Pós-OAuth: /calendar?gmail=connected&calendar=0|1
  useEffect(() => {
    const gmail = searchParams.get('gmail');
    if (!gmail) return;
    const cal = searchParams.get('calendar');
    if (gmail === 'connected') {
      if (cal === '0') {
        toast.error(
          'Google conectou, mas a Agenda não foi autorizada. Em Canais use Autorizar Agenda e aceite o Calendar.',
        );
      } else {
        toast.success('Google conectado — carregando Agenda…');
      }
      qc.invalidateQueries({ queryKey: ['calendar-status'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    } else if (gmail === 'error') {
      toast.error(
        searchParams.get('reason') || 'Falha na autorização Google',
      );
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
    const map = new Map<string, typeof eventsQ.data extends infer T ? any[] : never>();
    for (const d of weekDays) {
      map.set(d.toISOString().slice(0, 10), []);
    }
    for (const ev of eventsQ.data?.events || []) {
      if (!ev.start) continue;
      const key = new Date(ev.start).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventsQ.data, weekDays]);

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

  const create = async () => {
    if (!summary.trim()) {
      toast.error('Informe o título');
      return;
    }
    setCreating(true);
    try {
      const startIso = new Date(startLocal).toISOString();
      const endIso = new Date(endLocal).toISOString();
      const res = await calendarService.create({
        channelId: statusQ.data?.channelId || undefined,
        summary: summary.trim(),
        startIso,
        endIso,
        withMeet,
        attendeeEmails: attendees
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter((s) => s.includes('@')),
      });
      toast.success(
        res.meetLink ? 'Evento criado com Meet' : 'Evento criado',
      );
      setShowCreate(false);
      setSummary('');
      setAttendees('');
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar evento');
    } finally {
      setCreating(false);
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
          A Agenda ainda não está autorizada neste Google. Faça isso em{' '}
          <strong>Canais → Autorizar Agenda</strong> (ou pelo botão abaixo) e
          aceite o acesso ao Calendar na tela do Google.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={reauth}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Autorizar Agenda
          </button>
          <a
            href="/settings/channels"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Abrir Canais
          </a>
        </div>
      </div>
    );
  }

  if (eventsQ.isError) {
    const msg =
      eventsQ.error instanceof Error
        ? eventsQ.error.message
        : 'Falha ao carregar eventos';
    const needsAuth = /permiss|agenda|calendar|scope|403|autoriz/i.test(msg);
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-amber-400" />
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">{msg}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {needsAuth && (
            <button
              type="button"
              onClick={reauth}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Autorizar Agenda
            </button>
          )}
          <button
            type="button"
            onClick={() => eventsQ.refetch()}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700"
          >
            Tentar de novo
          </button>
          <a
            href="/settings/channels"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700"
          >
            Canais
          </a>
        </div>
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
            <RefreshCw className={`h-3.5 w-3.5 ${eventsQ.isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Evento
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Título da reunião"
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Convidados (e-mails, vírgula)"
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={withMeet}
                onChange={(e) => setWithMeet(e.target.checked)}
              />
              Google Meet
            </label>
            <button
              type="button"
              disabled={creating}
              onClick={create}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Criar evento
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
            <div
              key={key}
              className="min-h-[220px] bg-white p-2 dark:bg-zinc-950"
            >
              <div
                className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
                  isToday ? 'text-primary' : 'text-zinc-500'
                }`}
              >
                {fmtDay(day)}
              </div>
              <div className="space-y-1.5">
                {list.map((ev: any) => {
                  const bg = ev.backgroundColor || 'rgba(59,130,246,0.12)';
                  const fg = ev.foregroundColor || undefined;
                  const border = ev.backgroundColor
                    ? `${ev.backgroundColor}99`
                    : 'rgba(59,130,246,0.35)';
                  return (
                    <div
                      key={ev.id}
                      className="rounded-md border px-2 py-1.5 text-[11px] shadow-sm"
                      style={{
                        backgroundColor: bg,
                        borderColor: border,
                        color: fg || undefined,
                      }}
                    >
                      <div
                        className="font-semibold leading-snug"
                        style={{ color: fg || undefined }}
                      >
                        {ev.summary}
                      </div>
                      {ev.start && !ev.allDay && (
                        <div
                          className="opacity-80"
                          style={{ color: fg || undefined }}
                        >
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
                      <div className="mt-1 flex flex-wrap gap-1.5 opacity-90">
                        {ev.meetLink && (
                          <a
                            href={ev.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                            style={{ color: fg || undefined }}
                          >
                            <Video className="h-3 w-3" /> Meet
                          </a>
                        )}
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                            style={{ color: fg || undefined }}
                          >
                            <ExternalLink className="h-3 w-3" /> Google
                          </a>
                        )}
                      </div>
                    </div>
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
