'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button, MacWindow, SegmentedControl } from '@/components/ui/foundation';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';
import { PipelinesManager } from '@/features/pipelines/components/pipelines-manager';
import { currencyTotals } from '@/features/pipelines/components/money';

export function PipelinesWorkspace({ pipelineId }: { pipelineId?: string }) {
  const router = useRouter();
  const [stagesOpen, setStagesOpen] = useState(false);
  const [manager, setManager] = useState<'create' | 'list' | null>(null);
  const { data: pipelines = [], isLoading, isError, refetch } = useQuery({ queryKey: ['pipelines'], queryFn: () => pipelinesService.list() });
  const visible = pipelines.filter(p => !p.archived);
  const activeId = pipelineId ?? visible.find(p => p.isDefault)?.id ?? visible[0]?.id;
  const { data: board } = useQuery({ queryKey: ['pipeline-board', activeId], queryFn: () => pipelinesService.getBoard(activeId!), enabled: !!activeId });
  const cards = Object.values(board?.cards ?? {}).flat();
  const options = visible.map(p => ({ value: p.id, label: `${p.name}${p.isDefault ? ' · padrão' : ''}` }));
  if (activeId && !options.some(p => p.value === activeId)) options.push({ value: activeId, label: board?.pipeline.name ?? 'Pipeline' });

  return <div className="flex h-full min-w-0 flex-col gap-bq-space-section overflow-y-auto px-5 pb-5 pt-bq-space-content text-[var(--bq-t1)]">
    <header className="flex flex-wrap items-end justify-between gap-bq-space-section">
      <div><h1 className="font-[family-name:var(--bq-f-display)] text-2xl font-medium leading-bq-leading-page tracking-bq-tracking-display">Pipelines</h1>
        <p className="mt-bq-space-label text-bq-text-body text-[var(--bq-t3)]">Cada card é uma conversa: clique para abrir com a negociação ao lado. Arraste entre as etapas{board && <> · em aberto <b className="font-semibold text-[var(--bq-t1)]">{currencyTotals(cards.filter(c => c.status === 'OPEN'))}</b> · ganho <b className="font-semibold text-[var(--bq-ok-text)]">{currencyTotals(cards.filter(c => c.status === 'WON'))}</b></>}</p>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 max-w-full overflow-x-auto max-sm:w-full [&>div]:w-max [&>div]:flex-nowrap [&_button]:shrink-0 [&_button]:whitespace-nowrap"><SegmentedControl label="Pipeline" value={activeId ?? ''} options={options} onChange={id => router.push(`/pipelines/${id}`)} /></div>
        <Button className="shrink-0" onClick={() => setStagesOpen(true)} disabled={!board}><SlidersHorizontal size={13} />Etapas</Button>
        <Button className="shrink-0" variant="solid" onClick={() => setManager('create')}><Plus size={13} />Novo pipeline</Button>

      </div>
    </header>
    {isError && <div role="alert">Não foi possível carregar os pipelines. <Button onClick={() => void refetch()}>Tentar novamente</Button></div>}
    {activeId ? <div className="min-h-bq-size-project-list flex-1 overflow-hidden"><KanbanBoard key={activeId} pipelineId={activeId} /></div> : <p className="text-sm text-[var(--bq-t3)]">{isLoading ? 'Carregando pipelines…' : 'Nenhum pipeline criado ainda. Use Novo pipeline para começar.'}</p>}
    {board && stagesOpen && <StagesDialog open pipelineId={activeId!} initialStages={board.stages} onClose={() => setStagesOpen(false)} onSaved={() => setStagesOpen(false)} onManagePipelines={() => { setStagesOpen(false); setManager('list'); }} />}
    <MacWindow open={manager !== null} onClose={() => setManager(null)} title={manager === 'create' ? 'Novo pipeline' : 'Gerenciar pipelines'}>{manager && <PipelinesManager key={manager} initialCreating={manager === 'create'} onNavigate={() => setManager(null)} />}</MacWindow>
  </div>;
}
