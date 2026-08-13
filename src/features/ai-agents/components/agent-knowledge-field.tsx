'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  type AgentKnowledgeDoc,
} from '../services/ai-agents.service';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Na fila',
  INDEXING: 'Indexando',
  READY: 'Pronto',
  FAILED: 'Falhou',
};

interface AgentKnowledgeFieldProps {
  agentId?: string | null;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
}

export function AgentKnowledgeField({
  agentId,
  pendingFiles,
  onPendingFilesChange,
}: AgentKnowledgeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['agent-knowledge', agentId],
    queryFn: () => aiAgentsService.listKnowledge(agentId!),
    enabled: !!agentId,
  });

  const removeMutation = useMutation({
    mutationFn: (docId: string) =>
      aiAgentsService.removeKnowledge(agentId!, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-knowledge', agentId] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover'),
  });

  const addFiles = (list: FileList | File[]) => {
    const next = Array.from(list);
    if (!next.length) return;
    if (!agentId) {
      onPendingFilesChange([...pendingFiles, ...next]);
      return;
    }
    void uploadAll(next);
  };

  const uploadAll = async (files: File[]) => {
    if (!agentId) return;
    setUploading(true);
    try {
      for (const file of files) {
        const saved = await aiAgentsService.uploadKnowledge(agentId, file);
        if (saved.status === 'FAILED') {
          toast.error(
            `${file.name}: ${saved.errorMessage || 'não entrou na base'}`,
          );
        } else {
          toast.success(`${file.name} na base (${saved.chunkCount} trechos)`);
        }
      }
      await queryClient.invalidateQueries({
        queryKey: ['agent-knowledge', agentId],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao anexar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-card-foreground/80">
        Base de conhecimento
      </label>
      <p className="text-[11px] text-muted-foreground">
        PDF, DOCX, Markdown ou TXT. O agente usa isso no atendimento — não
        basta anexar, precisa ficar com status Pronto.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.md,.txt,.markdown,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        Anexar documento
      </button>

      {pendingFiles.length > 0 && !agentId && (
        <ul className="space-y-1">
          {pendingFiles.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{f.name}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onPendingFilesChange(pendingFiles.filter((_, j) => j !== i))
                }
                className="rounded p-1 text-zinc-400 hover:text-red-600"
                aria-label="Remover da fila"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {agentId && isLoading && (
        <p className="text-[11px] text-muted-foreground">Carregando base…</p>
      )}

      {agentId && docs.length > 0 && (
        <ul className="space-y-1">
          {docs.map((doc) => (
            <KnowledgeRow
              key={doc.id}
              doc={doc}
              onRemove={() => removeMutation.mutate(doc.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function KnowledgeRow({
  doc,
  onRemove,
}: {
  doc: AgentKnowledgeDoc;
  onRemove: () => void;
}) {
  const label = STATUS_LABEL[doc.status] ?? doc.status;
  const tone =
    doc.status === 'READY'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : doc.status === 'FAILED'
        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
  return (
    <li className="rounded-md border border-border px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{doc.fileName}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 ${tone}`}>{label}</span>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-zinc-400 hover:text-red-600"
            aria-label="Remover documento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {doc.status === 'READY' && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {doc.chunkCount} trechos indexados
        </p>
      )}
      {doc.status === 'FAILED' && doc.errorMessage && (
        <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
          {doc.errorMessage}
        </p>
      )}
    </li>
  );
}
