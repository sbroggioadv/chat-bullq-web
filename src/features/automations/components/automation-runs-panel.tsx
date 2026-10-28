"use client";

import { Sheet } from "@/components/ui/foundation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  XCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import {
  Automation,
  AutomationRun,
  AutomationRunStatus,
  automationsService,
} from "@/features/automations/services/automations.service";
import { ACTION_LABELS } from "@/features/automations/utils/labels";

const STATUS_META: Record<
  AutomationRunStatus,
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  SUCCESS: {
    label: "OK",
    cls: "bg-[var(--bq-ok-soft)] text-[var(--bq-ok)]  ",
    Icon: CheckCircle2,
  },
  PARTIAL: {
    label: "Parcial",
    cls: "bg-[var(--bq-warn-soft)] text-[var(--bq-warn)]  ",
    Icon: CircleAlert,
  },
  FAILED: {
    label: "Falhou",
    cls: "bg-[var(--bq-err-soft)] text-[var(--bq-err)]  ",
    Icon: XCircle,
  },
  SKIPPED: {
    label: "Pulado",
    cls: "bg-[var(--bq-raised)] text-[var(--bq-t2)]  ",
    Icon: CircleSlash,
  },
};

export function AutomationRunsPanel({
  automation,
  onClose,
}: {
  automation: Automation;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AutomationRunStatus | "ALL">(
    "ALL",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: runsData, isLoading } = useQuery({
    queryKey: ["automation-runs", automation.id, statusFilter],
    queryFn: () =>
      automationsService.runs(automation.id, {
        limit: 50,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      }),
    // No polling — Socket.IO `automation:run` push handles freshness.
  });

  // Subscribe to live runs. Backend emits to room `org:{orgId}` whenever
  // an AutomationRun is created. We prepend the new row into this query's
  // cache without refetching — single round-trip when the panel mounts,
  // then push-only.
  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: { automationId: string; run: AutomationRun }) => {
      if (msg.automationId !== automation.id) return;
      // Respect the active status filter — runs that don't match are
      // dropped client-side instead of polluting the visible list.
      if (statusFilter !== "ALL" && msg.run.status !== statusFilter) return;
      qc.setQueryData(
        ["automation-runs", automation.id, statusFilter],
        (
          prev:
            | { data: AutomationRun[]; nextCursor: string | null }
            | undefined,
        ) => {
          const existing = prev?.data ?? [];
          // Idempotent prepend in case the same event arrives twice
          // (socket reconnect can replay during transports switch).
          if (existing.some((r) => r.id === msg.run.id)) return prev;
          return {
            data: [msg.run, ...existing].slice(0, 50),
            nextCursor: prev?.nextCursor ?? null,
          };
        },
      );
    };
    socket.on("automation:run", handler);
    return () => {
      socket.off("automation:run", handler);
    };
  }, [automation.id, statusFilter, qc]);

  const runs = runsData?.data ?? [];

  return (
    <Sheet open onClose={onClose} title="Logs de execução">
      <div className="flex min-h-0 flex-col text-[var(--bq-t1)]">
        <header className="flex items-center justify-between border-b border-[var(--bq-hair)] px-5 py-4 ">
          <div>
            <h2 className="text-base font-semibold">Logs de execução</h2>
            <p className="text-xs text-[var(--bq-t3)]">{automation.name}</p>
          </div>
          <button
            aria-label="Fechar logs de execução"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] "
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-[var(--bq-hair)] px-5 py-3 ">
          <div className="flex flex-wrap gap-1">
            {(["ALL", "SUCCESS", "PARTIAL", "FAILED", "SKIPPED"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    statusFilter === s
                      ? "bg-[var(--bq-raised)] text-[var(--bq-t1)]  "
                      : "bg-[var(--bq-raised)] text-[var(--bq-t2)] hover:bg-[var(--bq-raised)]  "
                  }`}
                >
                  {s === "ALL" ? "Todos" : STATUS_META[s].label}
                </button>
              ),
            )}
          </div>
          {automation.autoPausedAt && (
            <div className="mt-3 rounded-lg border border-[var(--bq-err-soft)] bg-[var(--bq-err-soft)] p-3 text-xs text-[var(--bq-err)]   ">
              <strong>Pausada automaticamente:</strong>{" "}
              {automation.autoPausedReason}
              <br />
              <span className="text-[var(--bq-err)]">
                Reative pra zerar o contador de falhas.
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-[var(--bq-t3)]">
              Carregando…
            </div>
          )}
          {!isLoading && runs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[var(--bq-t3)]">
              Nenhum run nesse filtro
            </div>
          )}
          <ul className="divide-y divide-[var(--bq-hair)] ">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                expanded={expandedId === run.id}
                onToggle={() =>
                  setExpandedId(expandedId === run.id ? null : run.id)
                }
              />
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
}: {
  run: AutomationRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS_META[run.status];
  const Icon = meta.Icon;
  return (
    <li>
      <button
        className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[var(--bq-surface)] "
        onClick={onToggle}
      >
        <span
          className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <div className="flex-1 text-sm">
          <div className="flex items-center justify-between text-xs text-[var(--bq-t3)]">
            <time
              dateTime={run.startedAt}
              title={new Date(run.startedAt).toLocaleString("pt-BR")}
            >
              {new Date(run.startedAt).toLocaleString("pt-BR")}
            </time>
            {run.durationMs !== null && <span>{run.durationMs}ms</span>}
          </div>
          {run.errorCode && (
            <div className="mt-1 text-xs text-[var(--bq-err)] ">
              {run.errorCode}
              {run.errorMessage && `: ${run.errorMessage}`}
            </div>
          )}
          <div className="mt-1 text-xs text-[var(--bq-t3)]">
            {run.actionsLog.length === 0
              ? "sem ações executadas"
              : `${run.actionsLog.length} ${
                  run.actionsLog.length === 1 ? "ação" : "ações"
                }`}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="bg-[var(--bq-surface)] px-5 py-3 ">
          {run.actionsLog.length > 0 ? (
            <ol className="space-y-2 text-xs">
              {run.actionsLog.map((entry, i) => (
                <li
                  key={i}
                  className="rounded border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-2  "
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {entry.index + 1}. {ACTION_LABELS[entry.type]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-bq-text-phase-number font-medium ${
                        entry.status === "success"
                          ? "bg-[var(--bq-ok-soft)] text-[var(--bq-ok)]  "
                          : entry.status === "skipped"
                            ? "bg-[var(--bq-raised)] text-[var(--bq-t2)]  "
                            : "bg-[var(--bq-err-soft)] text-[var(--bq-err)]  "
                      }`}
                    >
                      {entry.status} · {entry.durationMs}ms
                    </span>
                  </div>
                  {entry.errorCode && (
                    <div className="mt-1 text-[var(--bq-err)] ">
                      {entry.errorCode}
                      {entry.errorMessage && `: ${entry.errorMessage}`}
                    </div>
                  )}
                  {entry.output && Object.keys(entry.output).length > 0 && (
                    <pre className="mt-1 overflow-x-auto text-bq-text-phase-number text-[var(--bq-t3)]">
                      {JSON.stringify(entry.output, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-xs text-[var(--bq-t3)]">
              Nenhuma ação executada (run pulado).
            </div>
          )}
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-[var(--bq-t3)]">
              Ver payload do gatilho
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-[var(--bq-surface)] p-2 text-bq-text-phase-number ">
              {JSON.stringify(run.triggerPayload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </li>
  );
}
