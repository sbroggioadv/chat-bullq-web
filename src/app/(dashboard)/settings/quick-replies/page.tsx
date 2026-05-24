'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuickReplies,
  useCreateQuickReply,
  useUpdateQuickReply,
  useDeleteQuickReply,
} from '@/features/quick-replies/hooks/use-quick-replies';
import type { QuickReply } from '@/features/quick-replies/services/quick-replies.service';

const MAX_CONTENT = 2000;

export default function SettingsQuickRepliesPage() {
  const { data: items = [], isLoading } = useQuickReplies();
  const createMut = useCreateQuickReply();
  const updateMut = useUpdateQuickReply();
  const deleteMut = useDeleteQuickReply();

  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ shortcut: '', title: '', content: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ shortcut: '', title: '', content: '' });
    setCreating(true);
  };

  const openEdit = (qr: QuickReply) => {
    setEditing(qr);
    setForm({ shortcut: qr.shortcut, title: qr.title, content: qr.content });
    setCreating(true);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!/^[a-z0-9_-]+$/i.test(form.shortcut)) {
      toast.error('Shortcut só aceita letras, dígitos, _ ou -');
      return;
    }
    if (form.content.length > MAX_CONTENT) {
      toast.error(`Conteúdo excede ${MAX_CONTENT} caracteres`);
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: form });
        toast.success('Atalho atualizado');
      } else {
        await createMut.mutateAsync(form);
        toast.success('Atalho criado');
      }
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        error?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Erro ao salvar'),
      );
    }
  };

  const handleDelete = async (qr: QuickReply) => {
    if (!confirm(`Apagar o atalho "/${qr.shortcut}"?`)) return;
    try {
      await deleteMut.mutateAsync(qr.id);
      toast.success('Atalho removido');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Erro ao remover');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Mensagens rápidas
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Atalhos privados. Digite <code>/atalho</code> no chat e pressione Enter.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo atalho
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-500">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhum atalho ainda. Clique em &quot;Novo atalho&quot; para criar.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((qr) => (
            <li key={qr.id} className="flex items-start justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    /{qr.shortcut}
                  </span>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {qr.title}
                  </span>
                  {qr.userId === null && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800">
                      org-wide
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{qr.content}</p>
              </div>
              <div className="ml-4 flex items-center gap-1">
                <button
                  onClick={() => openEdit(qr)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(qr)}
                  disabled={qr.userId === null}
                  title={qr.userId === null ? 'Atalho legado — não editável pela UI' : 'Apagar'}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {editing ? 'Editar atalho' : 'Novo atalho'}
              </h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Shortcut</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                  placeholder="saudacao"
                  maxLength={30}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Título</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Saudação inicial"
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Conteúdo ({form.content.length}/{MAX_CONTENT})
                </span>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Olá! Tudo bem?"
                  maxLength={MAX_CONTENT}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.shortcut.trim() || !form.title.trim() || !form.content.trim() || createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
