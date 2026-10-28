'use client';
import { Button } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';

export function SettingsSaveBar({ dirty, saving, disabled, onSave, onDiscard }: { dirty: boolean; saving?: boolean; disabled?: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty && !saving) return null;
  return <div className={styles.save} role="region" aria-label="Alterações pendentes"><span role="status">{saving ? 'Salvando alterações…' : 'Alterações não salvas'}</span><Button disabled={saving} onClick={onDiscard}>Descartar</Button><Button variant="solid" disabled={saving || disabled} onClick={onSave}>Salvar</Button></div>;
}
