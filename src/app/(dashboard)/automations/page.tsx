"use client";

import styles from "@/features/automations/components/automation-flow.module.css";
import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  X,
  Tag,
  Funnel,
  User,
  Send,
  ListChecks,
  Sparkles,
  ArrowRight,
  Clock3,
  Zap,
} from "lucide-react";
import { Button, Pill, Switch } from "@/components/ui/foundation";
import { toast } from "sonner";
import {
  Automation,
  automationsService,
} from "@/features/automations/services/automations.service";
import {
  ACTION_LABELS,
  FIELD_LABELS,
  OPERATOR_LABELS,
  TRIGGER_LABELS,
} from "@/features/automations/utils/labels";
import { AutomationBuilder } from "@/features/automations/components/automation-builder";
import { AutomationRunsPanel } from "@/features/automations/components/automation-runs-panel";

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingRuns, setViewingRuns] = useState<Automation | null>(null);

  const { data: meta } = useQuery({
    queryKey: ["automations-meta"],
    queryFn: automationsService.meta,
  });

  const {
    data: automations = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["automations"],
    queryFn: automationsService.list,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      automationsService.toggle(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: automationsService.remove,
    onSuccess: () => {
      toast.success("Automação removida");
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["automations"] });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-bq-space-section px-5 py-bq-space-content text-bq-text-body text-[var(--bq-t1)] antialiased">
      <header className="">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl leading-bq-leading-page font-[family-name:var(--bq-f-display)] font-medium tracking-bq-tracking-display">
                Automações
              </h1>
              <p className="mt-bq-space-label text-bq-text-body text-[var(--bq-t3)]">
                Quando algo acontece → executa uma sequência de ações. Regras
                com{" "}
                <Sparkles
                  size={12}
                  className="inline"
                  aria-label="ícone de IA"
                />{" "}
                usam o Jarvis.
              </p>
            </div>
          </div>
          <Button
            variant="solid"
            onClick={() => setCreating(true)}
            disabled={!meta}
          >
            <Plus size={14} /> Nova automação
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-sm text-[var(--bq-t3)]">Carregando…</div>
        )}
        {isError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--bq-hair)] p-4"
          >
            Não foi possível carregar as automações.{" "}
            <Button onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        )}
        {!isLoading && !isError && automations.length === 0 && (
          <p
            role="status"
            className="py-3 text-bq-text-row text-[var(--bq-t3)]"
          >
            Nenhuma automação ainda. Crie uma regra em Nova automação.
          </p>
        )}
        {!isLoading && automations.length > 0 && (
          <ul className="space-y-bq-space-item">
            {automations.map((a) => (
              <AutomationRow
                key={a.id}
                automation={a}
                onEdit={() => setEditing(a)}
                togglePending={toggleMutation.isPending}
                onToggle={(enabled) =>
                  toggleMutation.mutate({ id: a.id, enabled })
                }
                onRemove={() => {
                  if (confirm(`Remover a automação "${a.name}"?`)) {
                    removeMutation.mutate(a.id);
                  }
                }}
                onViewRuns={() => setViewingRuns(a)}
              />
            ))}
          </ul>
        )}
      </div>

      {(creating || editing) && meta && (
        <AutomationBuilder
          meta={meta}
          initial={editing ?? undefined}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={handleSaved}
        />
      )}

      {viewingRuns && (
        <AutomationRunsPanel
          automation={viewingRuns}
          onClose={() => setViewingRuns(null)}
        />
      )}
    </div>
  );
}

function relativeRun(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Data indisponível";
  const seconds = (timestamp - Date.now()) / 1000;
  const [unit, divisor] =
    Math.abs(seconds) < 60
      ? (["second", 1] as const)
      : Math.abs(seconds) < 3600
        ? (["minute", 60] as const)
        : Math.abs(seconds) < 86400
          ? (["hour", 3600] as const)
          : (["day", 86400] as const);
  return new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }).format(
    Math.round(seconds / divisor),
    unit,
  );
}

function AutomationRow({
  automation,
  onEdit,
  onToggle,
  onRemove,
  onViewRuns,
  togglePending,
}: {
  automation: Automation;
  togglePending: boolean;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
  onViewRuns: () => void;
}) {
  const failureRate =
    automation.runCount > 0
      ? Math.round((automation.failureCount / automation.runCount) * 100)
      : 0;

  const isAutoPaused = !!automation.autoPausedAt;
  const actionsCount = Array.isArray(automation.actions)
    ? automation.actions.length
    : 0;

  const conditions =
    "groups" in automation.conditions ? automation.conditions : null;

  return (
    <li
      className={`space-y-2.5 rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-bq-space-card py-bq-space-kpi ${automation.enabled ? "" : styles.paused}`}
    >
      <div className="flex items-start gap-bq-space-item">
        <div className="min-w-0 flex-1">
          <h2 className="text-bq-text-message font-semibold">
            {automation.name}
          </h2>
          {automation.description && (
            <p className="mt-0.5 text-xs text-[var(--bq-t3)]">
              {automation.description}
            </p>
          )}
        </div>
        <Switch
          label={`${automation.enabled ? "Pausar" : "Ativar"} ${automation.name}`}
          checked={automation.enabled}
          onChange={onToggle}
          disabled={togglePending}
        />
      </div>
      {isAutoPaused && (
        <div className={`${styles.warning} flex flex-wrap items-center gap-bq-space-sm rounded-bq-radius-button bg-[var(--bq-warn-soft)] px-bq-space-item py-bq-space-sm text-bq-text-control text-[var(--bq-warn-text)]`}>
          <Clock3 size={12} aria-hidden="true" />
          Pausada automaticamente:{" "}
          {automation.autoPausedReason || "limite de falhas atingido"}. Reative
          para zerar o contador de falhas.
        </div>
      )}
      <div className={styles.flow}>
        <span className="mr-bq-space-micro font-mono text-bq-text-phase-number font-semibold uppercase tracking-bq-tracking-label text-[var(--bq-t3)]">
          Quando
        </span>
        <Pill tone="info">
          <Zap size={12} aria-hidden="true" />
          {TRIGGER_LABELS[automation.trigger]}
        </Pill>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="mr-bq-space-micro font-mono text-bq-text-phase-number font-semibold uppercase tracking-bq-tracking-label text-[var(--bq-t3)]">
          Se{" "}
          {conditions?.groups?.length
            ? conditions.match === "AND"
              ? "todos os grupos"
              : "qualquer grupo"
            : ""}
        </span>
        {conditions?.groups?.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {conditions.groups.map((group, gi) => (
              <span
                key={gi}
                className={`${styles.condition} inline-flex min-h-bq-size-segment items-center rounded-bq-radius-field border border-dashed border-[var(--bq-hair-strong)] bg-[var(--bq-raised)] px-bq-space-row text-[var(--bq-t2)]`}
              >
                {group.rules
                  .map(
                    (rule) =>
                      `${FIELD_LABELS[rule.field] || rule.field} ${OPERATOR_LABELS[rule.op]} ${Array.isArray(rule.value) ? rule.value.join(", ") : (rule.value ?? "")}`,
                  )
                  .join(group.match === "AND" ? " E " : " OU ")}
              </span>
            ))}
          </div>
        ) : (
          <span className={`${styles.condition} inline-flex min-h-bq-size-segment items-center rounded-bq-radius-field border border-dashed border-[var(--bq-hair-strong)] bg-[var(--bq-raised)] px-bq-space-row text-[var(--bq-t2)] text-[var(--bq-t2)]`}>
            Sem condições
          </span>
        )}
        <ArrowRight size={12} aria-hidden="true" />
        <span className="mr-bq-space-micro font-mono text-bq-text-phase-number font-semibold uppercase tracking-bq-tracking-label text-[var(--bq-t3)]">
          Faz
        </span>
        {actionsCount === 0
          ? "Nenhuma ação"
          : automation.actions.map((action, i) => {
              const Icon =
                action.type === "add_tag" || action.type === "remove_tag"
                  ? Tag
                  : action.type === "add_to_pipeline" ||
                      action.type === "move_pipeline_stage"
                    ? Funnel
                    : action.type === "assign_user"
                      ? User
                      : Send;
              return (
                <Fragment key={i}>
                  {i > 0 && <ArrowRight size={12} aria-hidden="true" />}
                  <Pill>
                    <Icon size={12} aria-hidden="true" />
                    {ACTION_LABELS[action.type]}
                  </Pill>
                </Fragment>
              );
            })}
      </div>
      <div className="flex flex-wrap items-center gap-bq-space-sm font-mono text-bq-text-metadata font-medium text-[var(--bq-t3)]">
        <span>
          {automation.runCount} execuções · {automation.successCount} OK ·{" "}
          {automation.failureCount} falhas
          {failureRate > 0 && ` (${failureRate}%)`}{" ·"}
        </span>
        <span>
          {automation.lastRunAt ? (
            <time
              dateTime={automation.lastRunAt}
              title={new Date(automation.lastRunAt).toLocaleString("pt-BR")}
            >
              última: {relativeRun(automation.lastRunAt)}
            </time>
          ) : (
            "Ainda sem execução"
          )}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={onViewRuns}>
            <ListChecks size={14} /> Ver logs
          </Button>
          <Button onClick={onEdit}>
            <Pencil size={14} /> Editar
          </Button>
          <button
            type="button"
            className="bq-icon"
            onClick={onRemove}
            aria-label={`Remover ${automation.name}`}
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </li>
  );
}
