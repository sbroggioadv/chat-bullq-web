'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useUpdateAgentScope } from '../hooks/use-update-agent-scope';

interface Props {
  agent: {
    id: string;
    name: string;
    pipelineScope: string[];
    mentionHandle: string | null;
    rateLimitPerHour: number;
    consecutiveMsgCap: number;
    humanizationEnabled: boolean;
    minDelayMs: number;
  };
}

interface Pipeline {
  id: string;
  name: string;
}

export function AgentScopeForm({ agent }: Props) {
  const [pipelineScope, setPipelineScope] = useState<string[]>(agent.pipelineScope);
  const [mentionHandle, setMentionHandle] = useState<string>(agent.mentionHandle ?? '');
  const [rateLimitPerHour, setRateLimitPerHour] = useState(agent.rateLimitPerHour);
  const [consecutiveMsgCap, setConsecutiveMsgCap] = useState(agent.consecutiveMsgCap);
  const [humanizationEnabled, setHumanizationEnabled] = useState(agent.humanizationEnabled);
  const [minDelayMs, setMinDelayMs] = useState(agent.minDelayMs);

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/pipelines');
      return data.data ?? data;
    },
  });

  const updateMut = useUpdateAgentScope(agent.id);

  const togglePipeline = (id: string) => {
    setPipelineScope((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (mentionHandle && !/^[a-z0-9_-]+$/.test(mentionHandle)) {
      toast.error('Handle só aceita letras minúsculas, dígitos, _ ou -');
      return;
    }
    try {
      await updateMut.mutateAsync({
        pipelineScope,
        mentionHandle: mentionHandle || null,
        rateLimitPerHour,
        consecutiveMsgCap,
        humanizationEnabled,
        minDelayMs,
      });
      toast.success('Configuração salva');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Card 1: Pipelines */}
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Pipelines onde atua</h3>
        <p className="mb-3 text-xs text-zinc-500">Vazio = atua como fallback genérico da org.</p>
        <div className="grid grid-cols-2 gap-2">
          {pipelines.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pipelineScope.includes(p.id)}
                onChange={() => togglePipeline(p.id)}
                className="h-4 w-4 rounded border-zinc-300 text-primary"
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Card 2: Detecção em grupos */}
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Detecção em grupos</h3>
        <label className="block text-sm">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Handle (@mention)</span>
          <input
            type="text"
            value={mentionHandle}
            onChange={(e) => setMentionHandle(e.target.value.toLowerCase())}
            placeholder="vendas"
            maxLength={30}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="mt-1 text-xs text-zinc-500">Único na org. Cliente digita &quot;@{mentionHandle || 'vendas'}&quot; no grupo pra invocar.</p>
        </label>
      </div>

      {/* Card 3: Cadência humanizada */}
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Cadência humanizada</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={humanizationEnabled}
            onChange={(e) => setHumanizationEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-primary"
          />
          <span>Simular leitura + digitação (8-92s aleatório)</span>
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Delay mínimo (ms)</span>
          <input
            type="number"
            value={minDelayMs}
            onChange={(e) => setMinDelayMs(parseInt(e.target.value, 10) || 0)}
            min={0}
            max={300_000}
            className="mt-1 w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className="ml-2 text-xs text-zinc-500">15000ms = 15s</span>
        </label>
      </div>

      {/* Card 4: Anti-ban */}
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Limites anti-ban</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Máx msgs IA/hora no canal</span>
            <input
              type="number"
              value={rateLimitPerHour}
              onChange={(e) => setRateLimitPerHour(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={1000}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Máx consecutivas sem reply</span>
            <input
              type="number"
              value={consecutiveMsgCap}
              onChange={(e) => setConsecutiveMsgCap(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={50}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={updateMut.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
