'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { tagsService, type Tag } from '@/features/settings/services/tags.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280'];

export default function SettingsTagsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const orgId = useOrgId();
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tags'] });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await tagsService.create({ name: newName.trim(), color: newColor });
      setNewName('');
      toast.success('Tag criada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tag');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await tagsService.update(id, { name: editName, color: editColor });
      setEditingId(null);
      toast.success('Tag atualizada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta tag?')) return;
    try {
      await tagsService.remove(id);
      toast.success('Tag removida');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return <section>
    <h2 className={styles.sectionTitle}>Tags{tags ? ` · ${tags.length}` : ''}</h2>
    <div className={styles.block}>
      <div className={styles.tagList}>
        {isLoading ? <p role="status">Carregando tags…</p> : !tags?.length ? <p className={styles.unavailable}>Nenhuma tag criada</p> : tags.map(tag => editingId === tag.id ?
          <div className={styles.tagEditor} key={tag.id}>
            <input aria-label="Nome da tag em edição" value={editName} onChange={e => setEditName(e.target.value)} />
            <div className={styles.swatches}>{PRESET_COLORS.map(c => <button key={c} aria-label={`Cor ${c}`} aria-pressed={editColor === c} onClick={() => setEditColor(c)} style={{backgroundColor:c}} />)}</div>
            <Button onClick={() => handleUpdate(tag.id)}>Salvar</Button><Button onClick={() => setEditingId(null)}>Cancelar</Button>
          </div> : <span className={styles.tagChip} key={tag.id}>
            <i style={{backgroundColor:tag.color}} />{tag.name}
            <button aria-label={`Editar ${tag.name}`} onClick={() => startEdit(tag)}><Pencil size={12} /></button>
            <button aria-label={`Apagar ${tag.name}`} onClick={() => handleDelete(tag.id)}><Trash2 size={12} /></button>
          </span>)}
      </div>
      <SettingRow title="Nova tag" description="Ex.: VIP, Urgente, Indicação"><div className={styles.tagEditor}>
        <input aria-label="Nome da tag" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Nome da tag" />
        <div className={styles.swatches}>{PRESET_COLORS.map(c => <button key={c} aria-label={`Cor ${c}`} aria-pressed={newColor === c} onClick={() => setNewColor(c)} style={{backgroundColor:c}} />)}</div>
        <Button variant="solid" onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
      </div></SettingRow>
    </div>
  </section>;
}
