'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { segmentsService, type Segment } from '@/features/segments/services/segments.service';
import { SegmentFormDialog } from '@/features/segments/components/segment-form-dialog';

export function SegmentsList() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments', orgId],
    queryFn: () => segmentsService.list(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['segments'] });

  const removeMutation = useMutation({
    mutationFn: (id: string) => segmentsService.remove(id),
    onSuccess: () => {
      toast.success('Segmento removido');
      refresh();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover'),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (segment: Segment) => {
    setEditing(segment);
    setDialogOpen(true);
  };

  const handleRemove = (segment: Segment) => {
    if (
      !confirm(
        `Remover o segmento "${segment.name}"? Os grupos voltam a ser tratados por canal individualmente.`,
      )
    )
      return;
    removeMutation.mutate(segment.id);
  };

  return (
    <div>
      <h2 className={styles.sectionTitle}>Segmentos{segments ? ` · ${segments.length}` : ''}</h2>
      <div className={styles.block}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))
        ) : segments && segments.length > 0 ? (
          segments.map((seg) => (
            <div
              key={seg.id}
              className="border-b border-[var(--bq-hair)] px-3.5 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {seg.name}
                    </h3>
                    {!seg.isActive && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {seg.members.map((m) => {
                      const isPrimary = m.channelId === seg.primaryChannelId;
                      return (
                        <span
                          key={m.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                            isPrimary
                              ? 'bg-primary/10 text-primary'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {isPrimary && <Star className="h-3 w-3 fill-current" />}
                          {m.channel?.name ?? m.channelId}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(seg)}
                    className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(seg)}
                    disabled={removeMutation.isPending}
                    className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                    title="Remover"
                  >
                    {removeMutation.isPending &&
                    removeMutation.variables === seg.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="px-3.5 py-3 text-[var(--bq-t3)]">Nenhum segmento criado.</p>
        )}
        <SettingRow title="Novo segmento" description="Junte os números que estão nos mesmos grupos."><Button onClick={openCreate}><Plus size={13} /> Novo segmento</Button></SettingRow>
      </div>
      <p className="mt-2 text-xs text-[var(--bq-t3)]">Sem segmento, o mesmo grupo aparece repetido para cada número do escritório.</p>

      <SegmentFormDialog
        open={dialogOpen}
        segment={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
