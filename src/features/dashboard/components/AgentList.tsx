"use client";

import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/avatar";
import { mockupAvatarHue } from "@/components/ui/avatar-hue";
import type { AgentPerformance } from "@/features/dashboard/services/dashboard.service";
import styles from "@/features/dashboard/components/agents.module.css";

export function AgentList({ agents }: { agents: AgentPerformance[] }) {
  if (!agents.length)
    return (
      <p className="py-8 text-center text-xs text-[var(--bq-t3)]">
        Nenhum dado de agentes ainda
      </p>
    );
  const sorted = [...agents].sort(
    (a, b) => b.totalConversations - a.totalConversations,
  );
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Agente</th>
            <th>Ativas</th>
            <th title="Tempo médio de primeira resposta">TMR</th>
            <th title="Tempo médio de resolução">TMA</th>
            <th>Taxa de resolução</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.agent.id}>
              <td>
                <div
                  className={styles.who}
                  style={
                    {
                      "--bq-avatar-hue": mockupAvatarHue(a.agent.name),
                      "--bq-avatar-size": "var(--bq-size-compact-control)",
                    } as CSSProperties
                  }
                >
                  <Avatar
                    initials={a.agent.name.slice(0, 2)}
                    className="bq-avatar-mockup"
                  />
                  <span className="min-w-0 break-words">
                    {a.agent.name}
                    <small className="block text-bq-text-metadata text-[var(--bq-t3)]">
                      {a.totalConversations} no período ·{" "}
                      {a.closedConversations} fechadas
                    </small>
                  </span>
                </div>
              </td>
              <td>{a.activeConversations}</td>
              <td>
                {a.avgFirstResponseMinutes ?? "—"}
                {a.avgFirstResponseMinutes !== null && (
                  <small className="block text-bq-text-mark text-[var(--bq-t3)]">
                    min
                  </small>
                )}
              </td>
              <td>
                {a.avgResolutionMinutes ?? "—"}
                {a.avgResolutionMinutes !== null && (
                  <small className="block text-bq-text-mark text-[var(--bq-t3)]">
                    min
                  </small>
                )}
              </td>
              <td>{a.resolutionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-bq-space-sm text-bq-text-metadata text-[var(--bq-t3)]">
        CSAT por agente ainda não disponível.
      </p>
    </>
  );
}
