"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Activity,
  Sparkles,
  ArrowRight,
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
    <div className="flex h-full min-h-0 flex-col gap-[14px] px-5 py-[18px] text-[13px] text-[var(--bq-t1)] antialiased">
      <header className="">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl leading-[1.1] font-[family-name:var(--bq-f-display)] font-medium tracking-[-0.02em]">
                Automações
              </h1>
              <p className="mt-[5px] text-[13px] text-[var(--bq-t3)]">
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
          <p role="status" className="py-3 text-[12.5px] text-[var(--bq-t3)]">
            Nenhuma automação ainda. Crie uma regra em Nova automação.
          </p>
        )}
        {!isLoading && automations.length > 0 && (
          <ul className="space-y-2">
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
    <li className={`space-y-2.5 rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-[15px] py-[13px] ${automation.enabled ? "" : "opacity-[.72]"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-semibold">{automation.name}</h2>
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
        <div className="rounded-lg bg-[var(--bq-warn-soft)] p-2 text-xs text-[var(--bq-warn)]">
          Pausada automaticamente:{" "}
          {automation.autoPausedReason || "limite de falhas atingido"}. Reative
          para zerar o contador de falhas.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-xs [&_.bq-pill]:h-[26px] [&_.bq-pill]:rounded-lg [&_.bq-pill]:px-[9px] [&_.bq-pill]:text-xs">
        <span className="text-[10px] font-semibold uppercase text-[var(--bq-t3)]">
          Quando
        </span>
        <Pill tone="info">{TRIGGER_LABELS[automation.trigger]}</Pill>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase text-[var(--bq-t3)]">
          Se
        </span>
        {conditions?.groups?.length ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[var(--bq-t3)]">
              {conditions.match === "AND"
                ? "Todos os grupos"
                : "Qualquer grupo"}
              :
            </span>
            {conditions.groups.map((group, gi) => (
              <span
                key={gi}
                className="rounded-lg border border-dashed border-[var(--bq-hair-strong)] px-2 py-1"
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
          <span className="rounded-lg border border-dashed border-[var(--bq-hair-strong)] px-2 py-1 text-[var(--bq-t2)]">
            Sem condições
          </span>
        )}
        <ArrowRight size={12} aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase text-[var(--bq-t3)]">
          Faz
        </span>
        {actionsCount === 0
          ? "Nenhuma ação"
          : automation.actions.map((action, i) => (
              <Pill key={i}>
                {i + 1}. {ACTION_LABELS[action.type]}
              </Pill>
            ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--bq-t3)]">
        <span>
          {automation.runCount} execuções · {automation.successCount} OK ·{" "}
          {automation.failureCount} falhas
          {failureRate > 0 && ` (${failureRate}%)`}
        </span>
        <span>
          ·{" "}
          {automation.lastRunAt
            ? `última: ${new Date(automation.lastRunAt).toLocaleString("pt-BR")}`
            : "Ainda sem execução"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={onViewRuns}>
            <Activity size={14} /> Ver logs
          </Button>
          <Button onClick={onEdit}>
            <Pencil size={14} /> Editar
          </Button>
          <Button onClick={onRemove} aria-label={`Remover ${automation.name}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </li>
  );
}
