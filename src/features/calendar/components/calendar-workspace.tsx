"use client";

import { Button, SegmentedControl } from "@/components/ui/foundation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  calendarService,
  type CalendarEvent,
  type GoogleCalendarRef,
} from "@/features/calendar/services/calendar.service";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { channelsService } from "@/features/channels/services/channels.service";

type CalView = "week" | "month";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDayShort(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function fmtMonthTitle(d: Date) {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || "")
    .replace("#", "")
    .trim();
  if (raw.length !== 3 && raw.length !== 6)
    return `color-mix(in srgb, var(--bq-info) ${alpha * 100}%, transparent)`;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n))
    return `color-mix(in srgb, var(--bq-info) ${alpha * 100}%, transparent)`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function eventDurationMs(ev: CalendarEvent): number {
  if (ev.start && ev.end) {
    const ms = new Date(ev.end).getTime() - new Date(ev.start).getTime();
    if (ms > 0) return ms;
  }
  return 60 * 60_000;
}

function shiftEventToDay(
  ev: CalendarEvent,
  targetDayKey: string,
): { startIso: string; endIso: string } {
  const duration = eventDurationMs(ev);
  if (ev.allDay || !ev.start) {
    const startIso = `${targetDayKey}T12:00:00.000Z`;
    const endIso = new Date(
      new Date(startIso).getTime() + duration,
    ).toISOString();
    return { startIso, endIso };
  }
  const oldStart = new Date(ev.start);
  const [y, m, d] = targetDayKey.split("-").map(Number);
  const newStart = new Date(oldStart);
  newStart.setFullYear(y, m - 1, d);
  const newEnd = new Date(newStart.getTime() + duration);
  return { startIso: newStart.toISOString(), endIso: newEnd.toISOString() };
}

type Draft = {
  mode: "create" | "edit";
  conversationId?: string;
  summary: string;
  attendees: string;
  withMeet: boolean;
  startLocal: string;
  endLocal: string;
  calendarId: string;
  eventId?: string;
  googleCalendarId?: string;
  meetLink?: string | null;
  htmlLink?: string | null;
};

function defaultDraft(calendarId = "primary"): Draft {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    mode: "create",
    summary: "",
    attendees: "",
    withMeet: true,
    startLocal: toLocalInputValue(start),
    endLocal: toLocalInputValue(end),
    calendarId,
  };
}

function EventCard({
  ev,
  onEdit,
  dragging,
  compact = false,
}: {
  ev: CalendarEvent;
  onEdit: (ev: CalendarEvent) => void;
  dragging?: boolean;
  compact?: boolean;
}) {
  const solid = ev.backgroundColor || "var(--bq-info)";
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: ev.id,
      data: { type: "event", event: ev },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging || dragging ? 0.35 : 1,
    backgroundColor: hexToRgba(solid, 0.18),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative block w-full overflow-hidden rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2 py-1.5 pl-2.5 text-left text-[11px]  transition hover:ring-1 hover:ring-[var(--bq-hair-strong)]  "
    >
      <span
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-md"
        style={{ backgroundColor: solid }}
      />
      <div className="flex flex-wrap items-start gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab text-[var(--bq-t3)] opacity-70 hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastar para outro dia"
          title="Arrastar para remarcar"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(ev)}
          className="min-w-0 flex-1 text-left"
          title={ev.summary}
        >
          <div className="flex items-start gap-1">
            <div
              className={`min-w-0 flex-1 font-semibold leading-snug text-[var(--bq-t1)] ${compact ? "truncate" : "line-clamp-2"}`}
            >
              {ev.summary}
            </div>
            <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-[var(--bq-t3)]" />
          </div>
          {ev.start && !ev.allDay && (
            <div className="text-[var(--bq-t2)] ">
              {new Date(ev.start).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {ev.end && !compact
                ? ` – ${new Date(ev.end).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </div>
          )}
        </button>
        {!compact && (
          <div className="mt-1 flex w-full flex-wrap items-center gap-1.5 text-[var(--bq-t2)] ">
            {!compact && ev.calendarSummary && (
              <span
                className="inline-flex max-w-[9rem] truncate rounded px-1 py-0.5 text-[10px] font-semibold text-[var(--bq-t1)] "
                style={{ backgroundColor: hexToRgba(solid, 0.4) }}
              >
                {ev.calendarSummary}
              </span>
            )}
            {ev.meetLink && (
              <a
                aria-label={`Abrir Meet de ${ev.summary}`}
                href={ev.meetLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 font-medium text-[var(--bq-info-text)] hover:underline "
              >
                <Video className="h-3 w-3" /> {!compact && "Meet"}
              </a>
            )}
            {ev.htmlLink && (
              <a
                aria-label={`Abrir ${ev.summary} no Google`}
                href={ev.htmlLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 font-medium text-[var(--bq-t2)] hover:underline "
              >
                <ExternalLink className="h-3 w-3" /> {!compact && "Google"}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCell({
  day,
  events,
  isToday,
  isOutsideMonth,
  compact,
  onEdit,
  onCreate,
}: {
  day: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isOutsideMonth?: boolean;
  compact?: boolean;
  onCreate: (day: Date) => void;
  onEdit: (ev: CalendarEvent) => void;
}) {
  const key = dayKey(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${key}`,
    data: { type: "day", dayKey: key },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 p-2 transition-colors ${
        isOutsideMonth ? "bg-[var(--bq-surface)] " : "bg-[var(--bq-surface)] "
      } ${isOver ? "bg-[var(--bq-accent-soft)] ring-2 ring-inset ring-[var(--bq-hair-strong)]" : ""}`}
      style={{ minHeight: compact ? 110 : 220 }}
    >
      <div
        className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
          isToday
            ? "text-[var(--bq-t1)]"
            : isOutsideMonth
              ? "text-[var(--bq-t3)] "
              : "text-[var(--bq-t3)]"
        }`}
      >
        {compact ? (
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
              isToday ? "bg-[var(--bq-solid-bg)] text-[var(--bq-solid-fg)]" : ""
            }`}
          >
            {day.getDate()}
          </span>
        ) : (
          fmtDayShort(day)
        )}
      </div>
      {compact ? (
        <div className="space-y-1.5">
          {events.map((ev) => (
            <EventCard key={ev.id} ev={ev} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <>
          <div className="min-h-10 space-y-1 border-b border-[var(--bq-hair)] pb-2">
            {events
              .filter((ev) => ev.allDay)
              .map((ev) => (
                <EventCard key={ev.id} ev={ev} onEdit={onEdit} />
              ))}
          </div>
          <div className="relative h-[1152px]">
            {Array.from({ length: 24 }, (_, hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => {
                  const slot = new Date(day);
                  slot.setHours(hour, 0, 0, 0);
                  onCreate(slot);
                }}
                aria-label={`Criar evento em ${fmtDayShort(day)} às ${hour} horas`}
                className="absolute left-0 right-0 h-12 border-t border-[var(--bq-hair)] text-left text-[9px] text-[var(--bq-t3)] hover:bg-[var(--bq-raised)]"
                style={{ top: hour * 48 }}
              >
                <span className="absolute left-0 top-0">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </button>
            ))}
            {events
              .filter((ev) => !ev.allDay && ev.start)
              .map((ev) => {
                const start = new Date(ev.start!);
                return (
                  <div
                    key={ev.id}
                    className="absolute left-7 right-0"
                    style={{
                      top: (start.getHours() + start.getMinutes() / 60) * 48,
                      minHeight: Math.max(
                        28,
                        (eventDurationMs(ev) / 3600000) * 48 - 2,
                      ),
                    }}
                  >
                    <EventCard ev={ev} onEdit={onEdit} compact />
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

export function CalendarWorkspace() {
  const gridRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<CalView>("week");
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const visibleDays = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(anchor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [anchor, view]);

  const from = visibleDays[0].toISOString();
  const to = addDays(visibleDays[visibleDays.length - 1], 1).toISOString();
  const monthCursor = startOfMonth(anchor);
  const todayKey = dayKey(new Date());

  const statusQ = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => calendarService.status(),
    staleTime: 30_000,
  });

  const calendarsQ = useQuery({
    queryKey: ["calendar-list", statusQ.data?.channelId],
    queryFn: () =>
      calendarService.calendars(statusQ.data?.channelId || undefined),
    enabled: !!statusQ.data?.connected && !statusQ.data?.needsReauthForCalendar,
    staleTime: 60_000,
  });

  const calendars: GoogleCalendarRef[] = calendarsQ.data?.calendars || [];

  useEffect(() => {
    const gmail = searchParams.get("gmail");
    if (!gmail) return;
    const cal = searchParams.get("calendar");
    if (gmail === "connected") {
      if (cal === "0") {
        toast.error(
          "Google conectou, mas a Agenda não foi autorizada. Em Canais use Autorizar Agenda.",
        );
      } else {
        toast.success("Google conectado — carregando Agenda…");
      }
      qc.invalidateQueries({ queryKey: ["calendar-status"] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      qc.invalidateQueries({ queryKey: ["calendar-list"] });
    } else if (gmail === "error") {
      toast.error(searchParams.get("reason") || "Falha na autorização Google");
    }
    router.replace("/calendar");
  }, [searchParams, qc, router]);

  useEffect(() => {
    if (gridRef.current)
      gridRef.current.scrollTop = view === "week" ? 8 * 48 : 0;
  }, [view, statusQ.data?.connected, statusQ.data?.needsReauthForCalendar]);

  const eventsQ = useQuery({
    queryKey: ["calendar-events", from, to, statusQ.data?.channelId],
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
    for (const d of visibleDays) map.set(dayKey(d), []);
    for (const ev of eventsQ.data?.events || []) {
      if (!ev.start) continue;
      const key = dayKey(new Date(ev.start));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventsQ.data, visibleDays]);

  const conversationsQ = useQuery({
    queryKey: ["calendar-conversation-options", conversationSearch],
    queryFn: () =>
      inboxService.getConversations({
        search: conversationSearch,
        limit: "30",
      }),
    enabled: draft?.mode === "create",
  });

  const primaryCalId =
    calendars.find((c) => c.primary)?.id || calendars[0]?.id || "primary";

  const reauth = async () => {
    try {
      const { url } = await channelsService.gmailOAuthStart({
        channelId: statusQ.data?.channelId || undefined,
        name: "Gmail",
        returnTo: "/calendar",
      });
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao reconectar Google",
      );
    }
  };

  const openCreate = () => setDraft(defaultDraft(primaryCalId));

  const openEdit = (ev: CalendarEvent) => {
    const start = ev.start ? new Date(ev.start) : new Date();
    const end = ev.end
      ? new Date(ev.end)
      : new Date(start.getTime() + 3600_000);
    setDraft({
      mode: "edit",
      summary: ev.summary || "",
      attendees: (ev.attendees || []).map((a) => a.email).join(", "),
      withMeet: !!ev.meetLink,
      startLocal: toLocalInputValue(start),
      endLocal: toLocalInputValue(end),
      calendarId: ev.calendarId || "primary",
      eventId: ev.eventId || ev.id.split(":").slice(1).join(":") || ev.id,
      googleCalendarId: ev.calendarId || "primary",
      meetLink: ev.meetLink,
      htmlLink: ev.htmlLink,
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.summary.trim()) {
      toast.error("Informe o título");
      return;
    }
    const startDate = new Date(draft.startLocal);
    const endDate = new Date(draft.endLocal);
    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      toast.error(
        "Informe início e fim válidos; o fim deve ser após o início.",
      );
      return;
    }
    setSaving(true);
    try {
      const startIso = new Date(draft.startLocal).toISOString();
      const endIso = new Date(draft.endLocal).toISOString();
      const attendeeEmails = draft.attendees
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@"));

      if (draft.mode === "create") {
        const create = draft.conversationId
          ? (input: Parameters<typeof calendarService.create>[0]) =>
              calendarService.createFromConversation({
                ...input,
                conversationId: draft.conversationId!,
              })
          : calendarService.create;
        const res = await create({
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
            ? "Evento no Google · Meet pronto (gravação/transcrição no Meet)"
            : "Evento criado no Google",
        );
      } else {
        if (!draft.eventId || !draft.googleCalendarId) {
          toast.error("Evento inválido");
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
        toast.success("Evento atualizado no Google");
      }
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !draft ||
      draft.mode !== "edit" ||
      !draft.eventId ||
      !draft.googleCalendarId
    )
      return;
    if (!confirm("Apagar este evento no Google? Convidados serão notificados."))
      return;
    setDeleting(true);
    try {
      await calendarService.remove({
        eventId: draft.eventId,
        calendarId: draft.googleCalendarId,
        channelId: statusQ.data?.channelId || undefined,
      });
      toast.success("Evento apagado no Google");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao apagar");
    } finally {
      setDeleting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; event?: CalendarEvent }
      | undefined;
    if (data?.type === "event" && data.event) setActiveEvent(data.event);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const dragged = activeEvent;
    setActiveEvent(null);
    const { over } = event;
    if (!over || !dragged?.start) return;

    const overData = over.data.current as
      | { type?: string; dayKey?: string }
      | undefined;
    const targetKey =
      overData?.type === "day" && overData.dayKey
        ? overData.dayKey
        : String(over.id).startsWith("day:")
          ? String(over.id).slice(4)
          : null;
    if (!targetKey) return;

    const sourceKey = dayKey(new Date(dragged.start));
    if (sourceKey === targetKey) return;

    const eventId =
      dragged.eventId || dragged.id.split(":").slice(1).join(":") || dragged.id;
    const calendarId = dragged.calendarId || "primary";
    if (!eventId) {
      toast.error("Evento inválido para remarcar");
      return;
    }

    const { startIso, endIso } = shiftEventToDay(dragged, targetKey);
    setMoving(true);
    try {
      await calendarService.update(eventId, {
        channelId: statusQ.data?.channelId || undefined,
        calendarId,
        startIso,
        endIso,
      });
      toast.success(
        `Remarcado para ${new Date(startIso).toLocaleDateString("pt-BR")}`,
      );
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remarcar");
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    } finally {
      setMoving(false);
    }
  };

  const goPrev = () => {
    if (view === "week") setAnchor(addDays(startOfWeek(anchor), -7));
    else setAnchor(addMonths(startOfMonth(anchor), -1));
  };

  const goNext = () => {
    if (view === "week") setAnchor(addDays(startOfWeek(anchor), 7));
    else setAnchor(addMonths(startOfMonth(anchor), 1));
  };

  const goToday = () => {
    if (view === "week") setAnchor(startOfWeek(new Date()));
    else setAnchor(startOfMonth(new Date()));
  };

  const switchView = (next: CalView) => {
    setView(next);
    if (next === "week") setAnchor(startOfWeek(anchor));
    else setAnchor(startOfMonth(anchor));
  };

  if (statusQ.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--bq-t3)]" />
      </div>
    );
  }

  if (statusQ.isError)
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-5 text-[var(--bq-t1)]"
      >
        <p>Não foi possível verificar a Agenda.</p>
        <Button onClick={() => statusQ.refetch()}>Tentar novamente</Button>
      </div>
    );

  if (!statusQ.data?.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-[var(--bq-t3)]" />
        <p className="text-sm text-[var(--bq-t2)] ">
          Conecte o Google para usar a Agenda.
        </p>
        <Link className="bq-button" href="/settings/channels">
          Conectar Google
        </Link>
      </div>
    );
  }

  if (statusQ.data.needsReauthForCalendar) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-[var(--bq-warn)]" />
        <p className="max-w-md text-sm text-[var(--bq-t2)] ">
          Autorize a Agenda em <strong>Canais → Autorizar Agenda</strong>.
        </p>
        <button
          type="button"
          onClick={reauth}
          className="rounded-md bg-[var(--bq-solid-bg)] px-3 py-1.5 text-xs font-medium text-[var(--bq-solid-fg)]"
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
        : "Falha ao carregar eventos";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="max-w-md text-sm text-[var(--bq-t2)] ">{msg}</p>
        <button
          type="button"
          onClick={() => eventsQ.refetch()}
          className="rounded-md border border-[var(--bq-hair)] px-3 py-1.5 text-xs "
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="flex h-full min-h-0 flex-col gap-[14px] overflow-y-auto px-5 py-[18px] text-[13px] text-[var(--bq-t1)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Agenda</h1>
          <p className="mt-1 text-xs text-[var(--bq-t3)]">
            Google Agenda · {statusQ.data.email} · reuniões com link do Meet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={goToday}>Hoje</Button>
          <Button aria-label="Período anterior" onClick={goPrev}>
            ←
          </Button>
          <Button aria-label="Próximo período" onClick={goNext}>
            →
          </Button>
          <span className="text-sm font-medium">
            {view === "month"
              ? fmtMonthTitle(monthCursor)
              : `${fmtDayShort(visibleDays[0])} a ${fmtDayShort(visibleDays[6])}`}
          </span>
          <SegmentedControl
            label="Visualização"
            value={view}
            options={[
              { value: "week", label: "Semana" },
              { value: "month", label: "Mês" },
            ]}
            onChange={switchView}
          />
          <Button
            aria-label="Atualizar agenda"
            onClick={() => eventsQ.refetch()}
          >
            <RefreshCw
              size={14}
              className={eventsQ.isFetching ? "animate-spin" : ""}
            />
          </Button>
          <Button variant="solid" onClick={openCreate}>
            <Plus size={14} /> Evento
          </Button>
        </div>
      </header>
      {moving && (
        <p role="status" className="text-xs text-[var(--bq-t3)]">
          Salvando no Google…
        </p>
      )}
      <div className="grid min-h-0 flex-1 gap-[14px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <div
          ref={gridRef}
          className="order-2 min-h-[400px] min-w-0 overflow-auto rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] xl:order-1"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {view === "month" && (
              <div className="grid min-w-[770px] grid-cols-7 gap-px border-b border-[var(--bq-hair)] bg-[var(--bq-raised)] text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--bq-t3)]   ">
                {weekdayLabels.map((l) => (
                  <div key={l} className="bg-[var(--bq-surface)] py-1.5 ">
                    {l}
                  </div>
                ))}
              </div>
            )}
            <div
              className={`grid grid-cols-7 gap-px bg-[var(--bq-hair)] ${view === "month" ? "min-w-[770px]" : "min-w-[980px]"}`}
            >
              {visibleDays.map((day) => {
                const key = dayKey(day);
                const list = eventsByDay.get(key) || [];
                const isToday = key === todayKey;
                const isOutsideMonth =
                  view === "month" && day.getMonth() !== monthCursor.getMonth();
                return (
                  <DayCell
                    key={key}
                    day={day}
                    events={list}
                    isToday={isToday}
                    isOutsideMonth={isOutsideMonth}
                    compact={view === "month"}
                    onCreate={(start) => {
                      const next = defaultDraft(primaryCalId);
                      setDraft({
                        ...next,
                        startLocal: toLocalInputValue(start),
                        endLocal: toLocalInputValue(
                          new Date(start.getTime() + 3600000),
                        ),
                      });
                    }}
                    onEdit={openEdit}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeEvent ? (
                <div className="w-48 opacity-95 shadow-lg">
                  <EventCard
                    ev={activeEvent}
                    onEdit={() => undefined}
                    dragging
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        <aside className="order-1 min-w-0 overflow-y-auto rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-3 xl:order-2">
          {draft && (
            <div className="border-b border-[var(--bq-hair)] bg-[var(--bq-surface)] p-4  ">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--bq-t2)] ">
                  {draft.mode === "create"
                    ? "Novo evento (Google)"
                    : "Editar evento"}
                </p>
                <button
                  type="button"
                  aria-label="Fechar edição de evento"
                  onClick={() => setDraft(null)}
                  className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] "
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-2 grid-cols-1">
                <input
                  aria-label="Título do evento"
                  value={draft.summary}
                  onChange={(e) =>
                    setDraft({ ...draft, summary: e.target.value })
                  }
                  placeholder="Título"
                  className="rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm  "
                />
                <select
                  aria-label="Calendário"
                  value={draft.calendarId}
                  disabled={draft.mode === "edit"}
                  onChange={(e) =>
                    setDraft({ ...draft, calendarId: e.target.value })
                  }
                  className="rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm  "
                >
                  {(calendars.length
                    ? calendars
                    : [
                        {
                          id: "primary",
                          summary: "Principal",
                          backgroundColor: "var(--bq-info)",
                          foregroundColor: "var(--bq-t1)",
                        },
                      ]
                  ).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary}
                      {c.primary ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Convidados"
                  value={draft.attendees}
                  onChange={(e) =>
                    setDraft({ ...draft, attendees: e.target.value })
                  }
                  placeholder="Convidados (e-mails, vírgula)"
                  className="rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm  "
                />
                <div className="flex items-center gap-3 text-xs text-[var(--bq-t2)] ">
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
                  aria-label="Início do evento"
                  value={draft.startLocal}
                  onChange={(e) =>
                    setDraft({ ...draft, startLocal: e.target.value })
                  }
                  className="rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm  "
                />
                <input
                  type="datetime-local"
                  aria-label="Fim do evento"
                  value={draft.endLocal}
                  onChange={(e) =>
                    setDraft({ ...draft, endLocal: e.target.value })
                  }
                  className="rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm  "
                />
              </div>
              {draft.mode === "create" && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs">
                    Vincular a uma conversa (opcional)
                    <input
                      aria-label="Buscar conversa"
                      value={conversationSearch}
                      onChange={(e) => setConversationSearch(e.target.value)}
                      placeholder="Buscar por nome"
                      className="mt-1 w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2"
                    />
                  </label>
                  <select
                    aria-label="Conversa do evento"
                    value={draft.conversationId || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        conversationId: e.target.value || undefined,
                      })
                    }
                    className="w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] px-2 py-2 text-xs"
                  >
                    <option value="">Sem vínculo</option>
                    {(conversationsQ.data?.conversations || []).map(
                      (conversation) => (
                        <option key={conversation.id} value={conversation.id}>
                          {conversation.contact?.name || conversation.id}
                        </option>
                      ),
                    )}
                  </select>
                  {conversationsQ.isError && (
                    <p role="alert" className="text-xs text-[var(--bq-err)]">
                      Não foi possível buscar conversas.
                    </p>
                  )}
                </div>
              )}
              <p className="mt-2 text-[11px] text-[var(--bq-t3)]">
                Espelha no Google na hora. Arraste o evento (ícone ⋮⋮) para
                outro dia para remarcar rápido — preserva horário e duração.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {draft.mode === "edit" && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={remove}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--bq-err-soft)] px-3 py-1.5 text-xs font-medium text-[var(--bq-err)] hover:bg-[var(--bq-err-soft)]  "
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bq-solid-bg)] px-3 py-1.5 text-xs font-medium text-[var(--bq-solid-fg)] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {draft.mode === "create"
                    ? "Criar no Google"
                    : "Salvar no Google"}
                </button>
              </div>
            </div>
          )}

          {!draft && (
            <>
              <h2 className="mb-3 text-sm font-semibold">Neste período</h2>
              {eventsQ.isPending ? (
                <p role="status">Carregando eventos…</p>
              ) : !eventsQ.data?.events.length ? (
                <p className="text-xs text-[var(--bq-t3)]">
                  Nenhum evento neste período.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...(eventsQ.data?.events || [])]
                    .sort((a, b) =>
                      (a.start || "").localeCompare(b.start || ""),
                    )
                    .map((ev) => (
                      <Button
                        key={ev.id}
                        className="h-auto! w-full! justify-start! whitespace-normal! py-2! text-left"
                        onClick={() => openEdit(ev)}
                      >
                        <CalendarDays size={14} />
                        <span>
                          {ev.summary}
                          <small className="block text-[var(--bq-t3)]">
                            {ev.start
                              ? new Date(ev.start).toLocaleString("pt-BR")
                              : "Sem horário"}
                            {ev.meetLink ? " · Meet" : ""}
                          </small>
                        </span>
                      </Button>
                    ))}
                </div>
              )}
              <p className="mt-4 border-t border-[var(--bq-hair)] pt-3 text-xs text-[var(--bq-t3)]">
                Sugestões do Jarvis e avisos na conversa ainda não disponíveis.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
