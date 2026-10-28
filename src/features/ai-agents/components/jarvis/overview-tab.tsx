'use client';

import type { ReactNode } from 'react';
import { useSocket } from '@/features/inbox/hooks/use-socket';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FoundationPopover,
  Pill,
  PageSkeleton,
} from '@/components/ui/foundation';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  aiAgentsService,
  type Period,
} from '@/features/ai-agents/services/ai-agents.service';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';
import { RunsTable } from '@/features/ai-agents/components/jarvis/runs-table';
import { fmtMs, fmtNum } from '@/features/ai-agents/components/jarvis/format';

const ACTIONS: Record<string, string> = {
  REPLIED: 'Respondeu',
  DELEGATED: 'Passou para outro agente',
  TRANSFERRED_TO_HUMAN: 'Passou para humano',
  HANDED_BACK: 'Devolveu',
  CLOSED_CONVERSATION: 'Encerrou a conversa',
  NO_ACTION: 'Sem ação',
  NONE: 'Sem ação',
};
const panel = styles.panel;
const decimalUsd = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const usd = (value: number) => `US$ ${decimalUsd(value)}`;
const percent = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const periods: Record<Period, string> = {
  '24h': '24h',
  '7d': '7 dias',
  '30d': '30 dias',
};
const actionTone: Record<string, string> = {
  REPLIED: 'ok',
  DELEGATED: 'agent',
  TRANSFERRED_TO_HUMAN: 'human',
};
function useOverviewStats(period: Period) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['jarvis-overview', orgId, period],
    queryFn: () => aiAgentsService.orgStats(period),
    refetchInterval: 10_000,
  });
}
export function OverviewControls({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const { data: stats } = useOverviewStats(period);
  return (
    <>
      <select
        aria-label="Período das execuções"
        className={`bq-button ${styles.period}`}
        value={period}
        onChange={(event) => onPeriodChange(event.target.value as Period)}
      >
        <option value="24h">24h</option>
        <option value="7d">7 dias</option>
        <option value="30d">30 dias</option>
      </select>
      <FoundationPopover label="Tokens, limites e latência">
        <div className="max-w-xs p-3">
          {stats ? (
            <>
              <p className="text-xs text-[var(--bq-t2)]">
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
            </>
          ) : (
            <p role="status">Indicadores ainda indisponíveis.</p>
          )}
        </div>
      </FoundationPopover>
    </>
  );
}

function Bars({
  title,
  rows,
  money = false,
  embedded = false,
  denominator,
  children,
}: {
  title: string;
  rows: { label: string; value: number; tone?: string }[];
  money?: boolean;
  embedded?: boolean;
  denominator?: number;
  children?: ReactNode;
}) {
  const max = denominator ?? Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className={embedded ? styles.barGroup : panel} aria-label={title}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {rows.length && max > 0 ? (
        rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className={styles.barRow}>
            <span className="text-[var(--bq-t2)]" title={row.label}>
              {row.label}
            </span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                data-tone={row.tone}
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="tabular-nums">
              {denominator !== undefined
                ? percent((row.value / max) * 100)
                : money
                  ? decimalUsd(row.value)
                  : fmtNum(row.value)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-[var(--bq-t3)]">Sem dados no período.</p>
      )}
      {children}
    </section>
  );
}

export function JarvisOverviewTab({ period = '30d' }: { period?: Period }) {
  const orgId = useOrgId();
  const statsQuery = useOverviewStats(period);
  const { connected } = useSocket();
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
  if (statsQuery.isPending) return <PageSkeleton />;
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
        <div className={styles.failureAlert}>
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
            Limite mensal: {percent(stats.monthlyCap.percentUsed)} dos tokens
            utilizados.
          </p>
        )}
      <div className={styles.metrics}>
        {[
          [
            `Custo · ${periods[period]}`,
            usd(stats.cost.usd),
            `${usd(stats.cost.avgPerRun)} por execução`,
          ],
          [
            `Execuções · ${periods[period]}`,
            fmtNum(stats.runs.total),
            `${stats.runs.completed} concluídas · ${stats.runs.failed} falhas`,
          ],
          [
            'Taxa de sucesso',
            stats.runs.successRate == null
              ? '—'
              : percent(stats.runs.successRate),
            '',
          ],
          [
            'Passaram para humano',
            fmtNum(stats.byFinalAction.TRANSFERRED_TO_HUMAN ?? 0),
            stats.runs.total
              ? `${percent(((stats.byFinalAction.TRANSFERRED_TO_HUMAN ?? 0) / stats.runs.total) * 100)} das execuções`
              : 'Sem execuções no período',
          ],
        ].map(([label, value, hint]) => (
          <section key={label} className={styles.metric}>
            <div className={styles.metricLabel}>
              <span>{label}</span>
            </div>
            <p className={styles.metricValue}>{value}</p>
            <p className={styles.metricHint}>{hint}</p>
          </section>
        ))}
      </div>
      <div className={styles.overviewGrid}>
        <Bars
          title="Custo por modelo (US$)"
          rows={stats.byModel.map((model) => ({
            label: model.modelId,
            value: model.cost,
          }))}
          money
        />
        <Bars
          title="Como as execuções terminaram"
          denominator={stats.runs.total}
          rows={Object.entries(stats.byFinalAction)
            .sort(([a], [b]) => {
              const order = Object.keys(ACTIONS);
              const rank = (key: string) =>
                order.includes(key) ? order.indexOf(key) : order.length;
              return rank(a) - rank(b);
            })
            .map(([action, value]) => ({
              label: ACTIONS[action] ?? action,
              value,
              tone: actionTone[action],
            }))}
        >
          <p className="text-xs text-[var(--bq-t3)]">
            Erro: distribuição exclusiva ainda não disponível.
          </p>
        </Bars>
        <section className={panel} aria-label="Por agente">
          <h2 className={styles.panelTitle}>Por agente</h2>
          <div className={styles.agentRows}>
            <div className={`${styles.agentRow} ${styles.agentRowHeader}`}>
              <span>Agente</span>
              <span>Execuções</span>
              <span>Sucesso</span>
              <span aria-label="Custo em dólares americanos">Custo</span>
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
                  <span>{decimalUsd(agent.cost)}</span>
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
              tone: 'agent',
            }))}
          />
        </section>
      </div>
      <section className={panel}>
        <div className={styles.feedHeading}>
          <div className="flex items-center gap-2">
            <h2 className={styles.panelTitle}>Últimas execuções</h2>
            <span className={styles.feedBadge}>
              <Pill tone="info">{connected ? 'ao vivo' : 'A cada 10 s'}</Pill>
            </span>
          </div>
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
