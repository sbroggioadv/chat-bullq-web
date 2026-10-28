"use client";

import type { AgentPerformance } from "@/features/dashboard/services/dashboard.service";

export function AgentList({ agents }: { agents: AgentPerformance[] }) {
  if (agents.length === 0) {
    return (
      <p className="text-center text-xs text-[var(--bq-t3)] py-8">
        Nenhum dado de agentes ainda
      </p>
    );
  }

  const sorted = [...agents].sort(
    (a, b) => b.totalConversations - a.totalConversations,
  );

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="grid min-w-[460px] grid-cols-[1fr_60px_60px_60px_60px] items-center gap-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--bq-t3)]">
        <div>Agente</div>
        <div className="text-right">Ativas</div>
        <div className="text-right">TMR</div>
        <div className="text-right">TMA</div>
        <div className="text-right">Taxa</div>
      </div>
      {sorted.map((a) => (
        <div
          key={a.agent.id}
          className="grid min-w-[460px] grid-cols-[1fr_60px_60px_60px_60px] items-center gap-2 rounded-lg bg-[var(--bq-surface)] px-3 py-2 "
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bq-raised)] text-[10px] font-semibold text-[var(--bq-t2)]  ">
              {a.agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--bq-t1)] ">
                {a.agent.name}
              </p>
              <p className="text-[10px] text-[var(--bq-t3)]">
                {a.totalConversations} no período · {a.closedConversations}{" "}
                fechadas
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold tabular-nums text-[var(--bq-t2)] ">
              {a.activeConversations}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold tabular-nums text-[var(--bq-t2)] ">
              {a.avgFirstResponseMinutes ?? "—"}
              {a.avgFirstResponseMinutes !== null && (
                <span className="text-[9px] text-[var(--bq-t3)] ml-0.5">
                  min
                </span>
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold tabular-nums text-[var(--bq-t2)] ">
              {a.avgResolutionMinutes ?? "—"}
              {a.avgResolutionMinutes !== null && (
                <span className="text-[9px] text-[var(--bq-t3)] ml-0.5">
                  min
                </span>
              )}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                a.resolutionRate >= 70
                  ? "bg-[var(--bq-ok-soft)] text-[var(--bq-ok)]  "
                  : a.resolutionRate >= 40
                    ? "bg-[var(--bq-warn-soft)] text-[var(--bq-warn)]  "
                    : "bg-[var(--bq-raised)] text-[var(--bq-t2)]  "
              }`}
            >
              {a.resolutionRate}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
