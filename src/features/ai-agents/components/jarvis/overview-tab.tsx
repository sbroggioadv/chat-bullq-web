'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FoundationPopover, Pill } from '@/components/ui/foundation';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  aiAgentsService,
  type Period,
} from '@/features/ai-agents/services/ai-agents.service';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';
import { RunsTable } from '@/features/ai-agents/components/jarvis/runs-table';
import {
  fmtMs,
  fmtNum,
  fmtUsdShort,
} from '@/features/ai-agents/components/jarvis/format';

const ACTIONS: Record<string, string> = {
  REPLIED: 'Respondeu',
  DELEGATED: 'Passou para outro agente',
  TRANSFERRED_TO_HUMAN: 'Passou para humano',
  HANDED_BACK: 'Devolveu',
  CLOSED_CONVERSATION: 'Encerrou a conversa',
  NO_ACTION: 'Sem ação',
};
const panel = styles.panel;

function Bars({
  title,
  rows,
  money = false,
  embedded = false,
}: {
  title: string;
  rows: { label: string; value: number }[];
  money?: boolean;
  embedded?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className={embedded ? styles.barGroup : panel} aria-label={title}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {rows.length ? (
        rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className={styles.barRow}>
            <span className="text-[var(--bq-t2)]" title={row.label}>
              {row.label}
            </span>
            <span className="h-2 rounded bg-[var(--bq-raised-2)]">
              <span
                className="block h-full rounded-full bg-[var(--bq-t2)]"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="tabular-nums">
              {money ? fmtUsdShort(row.value) : fmtNum(row.value)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-[var(--bq-t3)]">Sem dados no período.</p>
      )}
    </section>
  );
}

export function JarvisOverviewTab() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState<Period>('30d');
  const statsQuery = useQuery({
    queryKey: ['jarvis-overview', orgId, period],
    queryFn: () => aiAgentsService.orgStats(period),
    refetchInterval: 10_000,
  });
  const feed = useQuery({
    queryKey: ['jarvis-feed', orgId],
    queryFn: () => aiAgentsService.feed({ limit: 50 }),
    refetchInterval: 10_000,
  });
  const agents = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });
  const stats = statsQuery.data;
  const name = (id: string) =>
    agents.data?.find((agent) => agent.id === id)?.name ?? id;
  if (statsQuery.isPending)
    return (
      <p className="p-6" role="status">
        Carregando indicadores…
      </p>
    );
  if (statsQuery.isError || !stats)
    return (
      <div className="p-6" role="alert">
        <p>Não foi possível carregar os indicadores dos agentes.</p>
        <button className="bq-button mt-3" onClick={() => statsQuery.refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  const failedRate = stats.runs.total
    ? (stats.runs.failed / stats.runs.total) * 100
    : 0;
  return (
    <div className={styles.overview}>
      {failedRate > 30 && stats.runs.total >= 5 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-err-soft)] p-3">
          <p>
            <strong>Taxa de falha alta:</strong> {stats.runs.failed} de{' '}
            {stats.runs.total} execuções no período.
          </p>
          <Link className="bq-button" href="/ai-agents?tab=runs">
            Ver execuções
          </Link>
        </div>
      )}
      {stats.monthlyCap.percentUsed != null &&
        stats.monthlyCap.percentUsed >= 80 && (
          <p role="status" className="rounded-xl bg-[var(--bq-warn-soft)] p-3">
            Limite mensal: {stats.monthlyCap.percentUsed.toFixed(1)}% dos tokens
            utilizados.
          </p>
        )}
      <div className={styles.metrics}>
        {[
          [
            'Custo no período',
            fmtUsdShort(stats.cost.usd),
            `${fmtUsdShort(stats.cost.avgPerRun)} por execução`,
          ],
          [
            'Execuções',
            fmtNum(stats.runs.total),
            `${stats.runs.completed} concluídas · ${stats.runs.failed} falhas`,
          ],
          [
            'Taxa de sucesso',
            stats.runs.successRate == null ? '—' : `${stats.runs.successRate}%`,
            '',
          ],
          [
            'Passaram para humano',
            fmtNum(stats.byFinalAction.TRANSFERRED_TO_HUMAN ?? 0),
            'No período selecionado',
          ],
        ].map(([label, value, hint]) => (
          <section key={label} className={styles.metric}>
            <div className={styles.metricLabel}>
              <span>{label === 'Custo no período' ? 'Custo' : label}</span>
              {label === 'Custo no período' && (
                <select
                  aria-label="Período das execuções"
                  className={styles.period}
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as Period)}
                >
                  <option value="24h">24h</option>
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                </select>
              )}
            </div>
            <p className={styles.metricValue}>{value}</p>
            <p className={styles.metricHint}>{hint}</p>
          </section>
        ))}
      </div>
      <div className={styles.overviewGrid}>
        <Bars
          title="Custo por modelo"
          rows={stats.byModel.map((model) => ({
            label: model.modelId,
            value: model.cost,
          }))}
          money
        />
        <Bars
          title="Como as execuções terminaram"
          rows={Object.entries(stats.byFinalAction).map(([action, value]) => ({
            label: ACTIONS[action] ?? action,
            value,
          }))}
        />
        <section className={panel} aria-label="Por agente">
          <h2 className={styles.panelTitle}>Por agente</h2>
          <div className={styles.agentRows}>
            <div className={`${styles.agentRow} ${styles.agentRowHeader}`}>
              <span>Agente</span>
              <span>Execuções</span>
              <span>Sucesso</span>
              <span>Custo</span>
            </div>
            {stats.byAgent.length ? (
              stats.byAgent.map((agent) => (
                <Link
                  key={agent.agentId}
                  prefetch={false}
                  href={`/ai-agents?agentId=${encodeURIComponent(agent.agentId)}`}
                  className={styles.agentRow}
                >
                  <span>{name(agent.agentId)}</span>
                  <span>{fmtNum(agent.runs)}</span>
                  <span
                    aria-label="Sucesso por agente indisponível"
                    title="O resumo da organização não informa sucesso por agente."
                  >
                    —
                  </span>
                  <span>{fmtUsdShort(agent.cost)}</span>
                </Link>
              ))
            ) : (
              <p className="py-3 text-xs text-[var(--bq-t3)]">
                Sem execuções no período.
              </p>
            )}
          </div>
        </section>
        <section className={panel} aria-label="Tools e passagens entre agentes">
          <Bars
            embedded
            title="Tools mais chamadas"
            rows={stats.tools.map((tool) => ({
              label: tool.name,
              value: tool.calls,
            }))}
          />
          <Bars
            embedded
            title="Passagens entre agentes"
            rows={stats.handoffs.map((handoff) => ({
              label: `${name(handoff.fromAgentId)} → ${name(handoff.toAgentId)}`,
              value: handoff.count,
            }))}
          />
        </section>
      </div>
      <section className={panel}>
        <div className={styles.feedHeading}>
          <div className="flex items-center gap-2">
            <h2 className={styles.panelTitle}>Últimas execuções</h2>
            <Pill tone="agent">A cada 10 s</Pill>
          </div>
          <FoundationPopover label="Tokens, limites e latência">
            <div className="max-w-xs p-3">
              <p className="mt-3 text-xs text-[var(--bq-t2)]">
                {fmtNum(stats.tokens.total)} tokens ·{' '}
                {fmtNum(stats.tokens.cacheRead)} em cache · p50{' '}
                {fmtMs(stats.latency.p50)} · p95 {fmtMs(stats.latency.p95)}
              </p>
              <p className="mt-2 text-xs text-[var(--bq-t3)]">
                Limite mensal de tokens:{' '}
                {stats.monthlyCap.cap == null
                  ? 'sem limite definido'
                  : `${fmtNum(stats.monthlyCap.used)} / ${fmtNum(stats.monthlyCap.cap)}`}
                . Limite financeiro ainda não disponível.
              </p>
            </div>
          </FoundationPopover>
        </div>
        {feed.isPending ? (
          <p role="status">Carregando execuções…</p>
        ) : feed.isError ? (
          <p role="alert">Não foi possível carregar as execuções.</p>
        ) : (
          <div className="overflow-x-auto">
            <RunsTable
              appearance="cards"
              runs={feed.data ?? []}
              emptyHint="Nenhuma execução recente."
            />
          </div>
        )}
      </section>
    </div>
  );
}
