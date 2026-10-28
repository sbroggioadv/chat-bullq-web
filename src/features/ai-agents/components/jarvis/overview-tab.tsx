'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Pill } from '@/components/ui/foundation';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  aiAgentsService,
  type Period,
} from '@/features/ai-agents/services/ai-agents.service';
import { PeriodSelector } from '@/features/ai-agents/components/jarvis/period-selector';
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
const panel =
  'rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-4';

function Bars({
  title,
  rows,
  money = false,
}: {
  title: string;
  rows: { label: string; value: number }[];
  money?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className={panel}>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {rows.length ? (
        rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className="my-3 grid grid-cols-[minmax(0,1fr)_minmax(30px,1fr)_auto] items-center gap-3 text-xs"
          >
            <span className="truncate text-[var(--bq-t2)]" title={row.label}>
              {row.label}
            </span>
            <span className="h-1.5 rounded-full bg-[var(--bq-raised)]">
              <span
                className="block h-full rounded-full bg-[var(--bq-agent)]"
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
    <div className="space-y-4 px-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--bq-t3)]">
          Dados da organização · atualiza a cada 10 s
        </span>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-3">
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
          <section key={label} className={panel}>
            <p className="text-xs text-[var(--bq-t3)]">{label}</p>
            <p className="my-2 text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            <p className="text-[11px] text-[var(--bq-t3)]">{hint}</p>
          </section>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3">
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
        <section className={panel}>
          <h2 className="mb-3 text-sm font-semibold">Por agente</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-[var(--bq-hair)] pb-2 text-xs text-[var(--bq-t3)]">
            <span>Agente</span>
            <span>Execuções</span>
            <span>Custo</span>
          </div>
          {stats.byAgent.length ? (
            stats.byAgent.map((agent) => (
              <Link
                key={agent.agentId}
                href={`/ai-agents?agentId=${encodeURIComponent(agent.agentId)}`}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-[var(--bq-hair)] py-3 text-xs"
              >
                <span className="truncate">{name(agent.agentId)}</span>
                <span>{fmtNum(agent.runs)}</span>
                <span>{fmtUsdShort(agent.cost)}</span>
              </Link>
            ))
          ) : (
            <p className="py-3 text-xs text-[var(--bq-t3)]">
              Sem execuções no período.
            </p>
          )}
        </section>
        <div className="space-y-4">
          <Bars
            title="Tools mais chamadas"
            rows={stats.tools.map((tool) => ({
              label: tool.name,
              value: tool.calls,
            }))}
          />
          <Bars
            title="Passagens entre agentes"
            rows={stats.handoffs.map((handoff) => ({
              label: `${name(handoff.fromAgentId)} → ${name(handoff.toAgentId)}`,
              value: handoff.count,
            }))}
          />
        </div>
      </div>
      <details className={panel}>
        <summary className="cursor-pointer text-sm font-semibold">
          Tokens, limites e latência
        </summary>
        <p className="mt-3 text-xs text-[var(--bq-t2)]">
          {fmtNum(stats.tokens.total)} tokens · {fmtNum(stats.tokens.cacheRead)}{' '}
          em cache · p50 {fmtMs(stats.latency.p50)} · p95{' '}
          {fmtMs(stats.latency.p95)}
        </p>
        <p className="mt-2 text-xs text-[var(--bq-t3)]">
          Limite mensal de tokens:{' '}
          {stats.monthlyCap.cap == null
            ? 'sem limite definido'
            : `${fmtNum(stats.monthlyCap.used)} / ${fmtNum(stats.monthlyCap.cap)}`}
          . Limite financeiro ainda não disponível.
        </p>
      </details>
      <section className={panel}>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold">Últimas execuções</h2>
          <Pill tone="agent">A cada 10 s</Pill>
        </div>
        {feed.isPending ? (
          <p role="status">Carregando execuções…</p>
        ) : feed.isError ? (
          <p role="alert">Não foi possível carregar as execuções.</p>
        ) : (
          <div className="overflow-x-auto">
            <RunsTable
              runs={feed.data ?? []}
              emptyHint="Nenhuma execução recente."
            />
          </div>
        )}
      </section>
    </div>
  );
}
