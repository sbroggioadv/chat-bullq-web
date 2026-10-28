'use client';
import { createPortal } from 'react-dom';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';

const subscribe = () => () => {};
const getHost = () => document.getElementById('settings-save-host');

export function SettingsSaveBar({ dirty, saving, disabled, onSave, onDiscard }: { dirty: boolean; saving?: boolean; disabled?: boolean; onSave: () => void; onDiscard: () => void }) {
  const host = useSyncExternalStore(subscribe, getHost, () => null);
  if (!dirty && !saving) return null;
  const bar = <div className={styles.save} role="region" aria-label="Alterações pendentes"><span role="status">{saving ? 'Salvando alterações…' : 'Alterações não salvas'}</span><Button disabled={saving} onClick={onDiscard}>Descartar</Button><Button variant="solid" disabled={saving || disabled} onClick={onSave}>Salvar</Button></div>;
  return host ? createPortal(bar, host) : bar;
}
