'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, Button } from '@/components/ui/foundation';
import { toast } from 'sonner';
import {
  aiAgentsService,
  CURATED_MODELS,
  DEPARTMENTS,
  type AgentKind,
} from '@/features/ai-agents/services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { AgentKnowledgeField } from '@/features/ai-agents/components/agent-knowledge-field';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DEFAULT_PROMPT = `Você é o(a) atendente da empresa. Sua missão é responder os clientes com simpatia, agilidade e clareza.

Regras:
- Use apenas as informações que você sabe com certeza.
- Se o cliente pedir algo fora do seu conhecimento, transfira para um humano.
- Mantenha tom natural e direto, sem rebuscar.`;

export function CreateAgentDialog({
  open,
  onClose,
  onCreated,
}: CreateAgentDialogProps) {
  const orgId = useOrgId();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<AgentKind>('WORKER');
  const [category, setCategory] = useState('');
  const [modelId, setModelId] = useState('zai/glm-5.2');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [parentAgentId, setParentAgentId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [squad, setSquad] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Load existing agents for the "reports to" dropdown.
  // Only enabled while dialog is open to avoid unnecessary fetches.
  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
    enabled: open,
  });

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Nome e system prompt são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const created = await aiAgentsService.create({
        isActive: false,
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        category: category.trim() || undefined,
        modelId,
        systemPrompt: systemPrompt.trim(),
        temperature,
        parentAgentId: parentAgentId || null,
        department: department || null,
        squad: squad.trim() || null,
      });
      for (const file of pendingFiles) {
        const saved = await aiAgentsService.uploadKnowledge(created.id, file);
        if (saved.status === 'FAILED') {
          toast.error(
            `${file.name}: ${saved.errorMessage || 'não entrou na base'}`,
          );
        }
      }
      toast.success(
        pendingFiles.length
          ? 'Agente criado. Confira o status dos documentos na edição.'
          : 'Agente criado!',
      );
      reset();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setKind('WORKER');
    setCategory('');
    setModelId('zai/glm-5.2');
    setSystemPrompt(DEFAULT_PROMPT);
    setTemperature(0.7);
    setParentAgentId('');
    setDepartment('');
    setSquad('');
    setPendingFiles([]);
  };

  // Eligible parents: any agent in the org (the list endpoint already
  // filters soft-deleted ones). Workers can report to workers (multi-level).
  const eligibleParents = agents ?? [];

  return (
    <Sheet open={open} onClose={onClose} title="Novo agente">
      <ol
        className="my-5 grid grid-cols-2 gap-2 text-xs"
        aria-label="Etapas da criação"
      >
        {['O que ele faz', 'Como ele fala', 'Onde atua', 'Testar e criar'].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index ? 'step' : undefined}
              className={
                step === index
                  ? 'font-semibold text-[var(--bq-agent-text)]'
                  : 'text-[var(--bq-t3)]'
              }
            >
              {index + 1}. {label}
            </li>
          ),
        )}
      </ol>
      <div className="space-y-4">
        <div hidden={step !== 0} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-card-foreground/80">
              Nome *
            </label>
            <input
              type="text"
              aria-label="Nome do agente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas Bravy"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground/80">
              Descrição (interna)
            </label>
            <input
              type="text"
              aria-label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Responde dúvidas sobre planos e fecha matrícula"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-card-foreground/80">
                Tipo
              </label>
              <select
                aria-label="Tipo de agente"
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as AgentKind;
                  setKind(next);
                  if (next === 'ORCHESTRATOR') setParentAgentId('');
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="WORKER">Worker (atende o cliente)</option>
                <option value="ORCHESTRATOR">
                  Orquestrador (roteia para workers)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-card-foreground/80">
                Categoria
              </label>
              <input
                type="text"
                aria-label="Categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="vendas / suporte / billing"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        </div>
        <div hidden={step !== 1} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-card-foreground/80">
              Modelo *
            </label>
            <select
              aria-label="Modelo"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {CURATED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.badge}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Escolha um modelo disponível no seu provedor.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground/80">
              System prompt *
            </label>
            <textarea
              aria-label="System prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Você não precisa repetir contexto da empresa — o sistema injeta
              nome, canal, hora, dados do contato e memória automaticamente.
            </p>
          </div>

          <AgentKnowledgeField
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
          />

          <div>
            <label className="block text-xs font-medium text-card-foreground/80">
              Criatividade ({temperature.toFixed(2)})
            </label>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              aria-label="Criatividade"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/70">
              <span>Determinístico</span>
              <span>Criativo</span>
            </div>
          </div>
        </div>

        <div hidden={step !== 2} className="space-y-4">
          {/* Organograma matricial ágil */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Organograma
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Define hierarquia (chefia direta), departamento e squad ágil.
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-card-foreground/80">
                  Reporta a (chefe direto)
                </label>
                <select
                  aria-label="Reporta a"
                  value={parentAgentId}
                  onChange={(e) => setParentAgentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">— Raiz / sem chefe (CEO virtual) —</option>
                  {eligibleParents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{' '}
                      {a.kind === 'ORCHESTRATOR' ? '(Orquestrador)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-card-foreground/80">
                    Departamento
                  </label>
                  <select
                    aria-label="Departamento"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">— Não definido —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-card-foreground/80">
                    Squad ágil
                  </label>
                  <input
                    type="text"
                    aria-label="Squad"
                    value={squad}
                    onChange={(e) => setSquad(e.target.value)}
                    placeholder="Ex: Inbound B2C"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Os canais, pipelines, skills e limites podem ser vinculados na
            página do agente depois de criar.
          </p>
        </div>
        {step === 3 && (
          <div className="my-4 space-y-3 rounded-xl border border-border p-4">
            <h3 className="font-semibold">Testar antes de ligar</h3>
            <p className="text-sm text-muted-foreground">
              Simulação ainda não disponível na API. Crie pausado, revise o
              prompt e configure os canais na página do agente antes de ativar.
            </p>
            <p className="text-sm">
              {name} · {modelId} · {pendingFiles.length} documento(s)
            </p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {step > 0 && (
            <Button disabled={saving} onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button
              variant="solid"
              onClick={() => {
                if (step === 0 && !name.trim()) {
                  toast.error('Informe o nome do agente');
                  return;
                }
                if (step === 1 && !systemPrompt.trim()) {
                  toast.error('Informe o prompt');
                  return;
                }
                setStep(step + 1);
              }}
            >
              Continuar
            </Button>
          ) : (
            <Button variant="solid" onClick={handleSave} disabled={saving}>
              {saving ? 'Criando…' : 'Criar pausado'}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
