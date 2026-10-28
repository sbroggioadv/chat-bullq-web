'use client';

import { useState } from 'react';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { type FeedRun } from '@/features/ai-agents/services/ai-agents.service';
import {
  FINAL_ACTION_META,
  STATUS_META,
  fmtMs,
  fmtNum,
  fmtRelative,
  fmtUsd,
} from '@/features/ai-agents/components/jarvis/format';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';

interface RunsTableProps {
  runs: FeedRun[];
  emptyHint?: string;
  appearance?: 'table' | 'cards';
}

export function RunsTable({
  runs,
  emptyHint,
  appearance = 'table',
}: RunsTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!runs.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800">
        {emptyHint ?? 'Nenhuma execução ainda.'}
      </div>
    );
  }

  if (appearance === 'cards') {
    return (
      <div className={styles.runList}>
        {runs.map((run) => {
          const action = FINAL_ACTION_META[run.finalAction ?? 'NONE'];
          const status = STATUS_META[run.status];
          const tone =
            run.status === 'FAILED'
              ? 'error'
              : run.finalAction === 'DELEGATED'
                ? 'agent'
                : run.finalAction === 'TRANSFERRED_TO_HUMAN'
                  ? 'human'
                  : 'default';
          return (
            <details key={run.id} className={styles.runCard}>
              <summary>
                <span className={styles.runIcon}>
                  <Bot size={14} />
                </span>
                <span className={styles.runText}>
                  <strong>{run.agent.name}</strong>
                  <span>
                    {fmtRelative(run.startedAt)} · {fmtMs(run.durationMs)} ·{' '}
                    {fmtUsd(Number(run.costUsd))}
                  </span>
                  <span>
                    {run.modelId} · {fmtNum(run.inputTokens + run.outputTokens)}{' '}
                    tokens · {status.label}
                  </span>
                </span>
                <span className={styles.runResult} data-tone={tone}>
                  {run.status === 'FAILED' ? status.label : action.label}
                </span>
              </summary>
              <RunDetail run={run} fallbackError={run.errorMessage} card />
            </details>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <th className="w-6 px-3 py-2"></th>
            <th className="px-3 py-2 text-left font-semibold">Quando</th>
            <th className="px-3 py-2 text-left font-semibold">Agente</th>
            <th className="px-3 py-2 text-left font-semibold">Modelo</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-left font-semibold">Ação final</th>
            <th className="px-3 py-2 text-right font-semibold">Tokens</th>
            <th className="px-3 py-2 text-right font-semibold">Custo</th>
            <th className="px-3 py-2 text-right font-semibold">Latência</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const isExpanded = expanded === r.id;
            const action = FINAL_ACTION_META[r.finalAction ?? 'NONE'];
            const status = STATUS_META[r.status];
            const tokens = r.inputTokens + r.outputTokens;
            return (
              <RunRow
                key={r.id}
                run={r}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpanded((prev) => (prev === r.id ? null : r.id))
                }
                action={action}
                status={status}
                tokens={tokens}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RunRow({
  run,
  isExpanded,
  onToggle,
  action,
  status,
  tokens,
}: {
  run: FeedRun;
  isExpanded: boolean;
  onToggle: () => void;
  action: { label: string; color: string };
  status: { label: string; color: string };
  tokens: number;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-zinc-100 bg-white transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-zinc-400">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
          {fmtRelative(run.startedAt)}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {run.agent.name}
            </span>
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800">
              {run.agent.kind === 'ORCHESTRATOR' ? 'orq' : 'wkr'}
            </span>
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-zinc-500">
          {run.modelId
            .replace('zai/', '')
            .replace('zhipu/', '')
            .replace('anthropic/', '')
            .replace('openai/', '')
            .replace('google/', '')}
        </td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
            {status.label}
          </span>
        </td>
        <td className="px-3 py-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${action.color}`}
          >
            {action.label}
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
          {fmtNum(tokens)}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
          {fmtUsd(Number(run.costUsd))}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-zinc-500">
          {fmtMs(run.durationMs)}
        </td>
      </tr>
      {isExpanded && <RunDetail run={run} fallbackError={run.errorMessage} />}
    </>
  );
}

function RunDetail({
  run,
  fallbackError,
  card = false,
}: {
  run: FeedRun;
  fallbackError: string | null;
  card?: boolean;
}) {
  const tools = run.toolCalls ?? [];
  const content = (
    <>
      {fallbackError && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">
          <strong>Erro:</strong> {fallbackError}
        </p>
      )}
      <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Run id
          </p>
          <code className="mt-0.5 block truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] dark:bg-zinc-800">
            {run.id}
          </code>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Conversa
          </p>
          <code className="mt-0.5 block truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] dark:bg-zinc-800">
            {run.conversationId}
          </code>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Cache
          </p>
          <p className="mt-0.5 tabular-nums text-zinc-700 dark:text-zinc-300">
            {fmtNum(run.cacheReadTokens)} read · {fmtNum(run.cacheWriteTokens)}{' '}
            write
          </p>
        </div>
      </div>
      {tools.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Tools chamadas ({tools.length})
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tools.map((t, i) => (
              <span
                key={i}
                className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {t.toolName}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
  return card ? (
    <div className="px-3 pb-3">{content}</div>
  ) : (
    <tr className="border-b border-zinc-100 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/40">
      <td colSpan={9} className="px-6 py-3">
        {content}
      </td>
    </tr>
  );
}
