'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/foundation';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';

export default function PipelineBoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pipelineId = params?.id;
  const [stagesOpen, setStagesOpen] = useState(false);
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: () => pipelinesService.list() });
  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId], queryFn: () => pipelinesService.getBoard(pipelineId!), enabled: !!pipelineId,
  });
  if (!pipelineId) return null;
  const cards = Object.values(board?.cards ?? {}).flat();
  const sum = (status: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cards.filter(c => c.status === status && c.currency === 'BRL').reduce((total, c) => total + (Number(c.value) || 0), 0));
  return <div className="flex h-full min-w-0 flex-col text-[var(--bq-t1)]">
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
      <div className="flex min-w-0 items-start gap-3"><Button aria-label="Voltar aos pipelines" onClick={() => router.push('/pipelines')}><ArrowLeft size={14} /></Button><div><h1 className="text-[22px] font-semibold tracking-tight">Pipelines</h1><p className="mt-1 text-xs text-[var(--bq-t3)]">Cada card é uma conversa. Arraste entre as etapas.</p>{board && <p className="mt-1 text-xs text-[var(--bq-t2)]">Em aberto <b>{sum('OPEN')}</b> · Ganho <b className="text-[var(--bq-ok)]">{sum('WON')}</b> <span className="text-[var(--bq-t3)]">(BRL)</span></p>}</div></div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <select aria-label="Trocar pipeline" value={pipelineId} onChange={e => router.push(`/pipelines/${e.target.value}`)} className="h-[30px] max-w-full rounded-[9px] border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2 text-xs">
          {!pipelines.some(p => p.id === pipelineId) && <option value={pipelineId}>{board?.pipeline.name || 'Pipeline'}</option>}
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' · padrão' : ''}</option>)}
        </select>
        <Button onClick={() => setStagesOpen(true)} disabled={!board}><Settings size={13} />Etapas</Button>
        <Button variant="solid" onClick={() => router.push('/pipelines')}>Gerenciar pipelines</Button>
      </div>
    </header>
    {board?.pipeline.description && <p className="px-6 pb-3 text-xs text-[var(--bq-t2)]">{board.pipeline.description}</p>}
    <div className="min-h-0 flex-1 overflow-hidden"><KanbanBoard pipelineId={pipelineId} /></div>
    {board && <StagesDialog open={stagesOpen} pipelineId={pipelineId} initialStages={board.stages} onClose={() => setStagesOpen(false)} onSaved={() => setStagesOpen(false)} />}
  </div>;
}
