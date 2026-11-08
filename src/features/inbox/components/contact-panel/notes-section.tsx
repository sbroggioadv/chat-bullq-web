'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { conversationActionsService, type InternalNote } from '@/features/inbox/services/conversation-actions.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';

export function NotesSection({ conversationId }: { conversationId: string }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  const userId = useAuthStore(s => s.user?.id);
  return <Notes key={`${userId}:${orgId}:${conversationId}`} conversationId={conversationId} />;
}
function Notes({ conversationId }: { conversationId: string }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  const userId = useAuthStore(s => s.user?.id);
  const qc = useQueryClient();
  const key = ['conversation-notes', orgId, userId, conversationId];
  const notes = useQuery({ queryKey: key, queryFn: () => conversationActionsService.notes(conversationId), enabled: Boolean(userId && orgId && conversationId), retry: false });
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<InternalNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'delete') => {
      if (!userId) throw new Error('Entre novamente para gerenciar notas.');
      if (action === 'delete' && confirmDelete) {
        if (!notes.data?.some(n => n.id === confirmDelete && n.authorId === userId)) throw new Error('Somente o autor pode apagar a nota.');
        return conversationActionsService.deleteNote(conversationId, confirmDelete);
      }
      if (editing) {
        if (editing.authorId !== userId) throw new Error('Somente o autor pode editar a nota.');
        return conversationActionsService.updateNote(conversationId, editing.id, draft);
      }
      return conversationActionsService.createNote(conversationId, draft);
    },
    onSuccess: () => { setDraft(''); setEditing(null); setConfirmDelete(null); qc.invalidateQueries({ queryKey: key }); },
  });
  return <section aria-label="Notas internas" className="min-w-0 break-words space-y-3 text-xs text-[var(--bq-t2)]">
    <h3 className="font-semibold text-[var(--bq-t1)]">Notas internas</h3>
    {notes.isLoading && <p role="status">Carregando notas…</p>}
    {notes.isError && <p role="alert">{inboxErrorMessage(notes.error, 'Não foi possível carregar as notas.')} <button className="bq-button" onClick={() => notes.refetch()}>Tentar novamente</button></p>}
    {notes.data?.length === 0 && <p>Nenhuma nota interna.</p>}
    <ul className="space-y-3">{notes.data?.map(note => <li key={note.id} className="rounded-lg border border-[var(--bq-hair)] p-2">
      <p className="whitespace-pre-wrap break-words">{note.content}</p>
      <p className="mt-1 text-[var(--bq-t3)]">{note.authorName} · {new Date(note.createdAt).toLocaleString('pt-BR')}{note.updatedAt && note.updatedAt !== note.createdAt ? ' · editada' : ''}</p>
      {note.authorId === userId && <div className="flex flex-wrap gap-2"><button className="bq-button" disabled={mutation.isPending} onClick={() => { setEditing(note); setDraft(note.content); }}>Editar nota</button><button className="bq-button" disabled={mutation.isPending} onClick={() => setConfirmDelete(note.id)}>Apagar nota</button></div>}
      {confirmDelete === note.id && <div><p>Apagar esta nota?</p><button className="bq-button" disabled={mutation.isPending} onClick={() => mutation.mutate('delete')}>Confirmar exclusão</button><button className="bq-button" onClick={() => setConfirmDelete(null)}>Cancelar exclusão</button></div>}
    </li>)}</ul>
    <form onSubmit={e => { e.preventDefault(); mutation.mutate('save'); }} className="space-y-2">
      <label className="block">{editing ? 'Editar nota interna' : 'Nova nota interna'}<textarea className="mt-1 w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-2" maxLength={4000} rows={3} value={draft} onChange={e => setDraft(e.target.value)} /></label>
      <p className="text-[var(--bq-t3)]">{draft.length}/4.000 · Visível apenas à equipe.</p>
      <button className="bq-button" type="submit" disabled={!userId || !draft.trim() || draft.trim().length > 4000 || mutation.isPending}>{editing ? 'Salvar edição' : 'Salvar nota'}</button>
      {editing && <button className="bq-button" type="button" onClick={() => { setEditing(null); setDraft(''); }}>Cancelar edição</button>}
    </form>
    {mutation.isError && <p role="alert">{inboxErrorMessage(mutation.error, 'Não foi possível salvar a nota.')}</p>}
  </section>;
}
