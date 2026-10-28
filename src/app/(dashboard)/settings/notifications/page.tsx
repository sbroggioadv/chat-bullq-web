'use client';
import { useSyncExternalStore, useState } from 'react';
import { Button, SettingRow, Switch } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
const types = [
  ['NEW_MESSAGE', 'Nova mensagem'], ['CONVERSATION_ASSIGNED', 'Conversa atribuída'], ['CONVERSATION_TRANSFERRED', 'Transferência'], ['SLA_WARNING', 'Alerta de SLA'], ['SLA_BREACH', 'SLA violado'], ['MENTION', 'Menção'], ['SYSTEM', 'Sistema'],
] as const;
const channels = [['inApp', 'No app'], ['browserPush', 'Push'], ['sound', 'Som']] as const;
const initial = () => Object.fromEntries(types.map(([type]) => [type, { inApp: true, browserPush: true, sound: true }]));
const subscribe = () => () => {};
const permissionSnapshot = () => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
export default function SettingsNotificationsPage() {
  const permission = useSyncExternalStore(subscribe, permissionSnapshot, () => 'unsupported');
  const [requested, setRequested] = useState<NotificationPermission | null>(null);
  const status = requested ?? permission;
  const [prefs, setPrefs] = useState(initial);
  const [dnd, setDnd] = useState(false);
  const [start, setStart] = useState('22:00');
  const [end, setEnd] = useState('08:00');
  const dirty = dnd || start !== '22:00' || end !== '08:00' || JSON.stringify(prefs) !== JSON.stringify(initial());
  return <div className="space-y-5">
    <section><h2 className={styles.sectionTitle}>Neste navegador</h2><div className={styles.block}><SettingRow title="Notificações push" description={status === 'unsupported' ? 'Não suportadas neste navegador.' : status === 'denied' ? 'Permissão negada. Altere nas configurações do navegador.' : status === 'granted' ? 'Permissão concedida neste navegador.' : 'Permita que este navegador mostre notificações.'}>
      <Button disabled={status !== 'default'} onClick={async () => setRequested(await Notification.requestPermission())}>{status === 'granted' ? 'Permitidas' : 'Ativar push'}</Button>
    </SettingRow></div></section>
    <p role="status" className="text-xs text-[var(--bq-t3)]">Preferências e Não perturbe: persistência ainda não disponível. Os controles abaixo são uma prévia, não representam configurações salvas e não alteram os alertas.</p>
    <section><h2 className={styles.sectionTitle}>Avisar quando</h2><div className={styles.block} aria-label="Prévia de preferências">{types.map(([type,label]) => <SettingRow key={type} title={label}><div className="flex gap-4">{channels.map(([key,title]) => <div key={key} className="flex flex-col items-center gap-2"><span className="text-xs text-[var(--bq-t3)]">{title}</span><Switch label={`${label}: ${title}`} checked={prefs[type][key]} disabled={key === 'browserPush' && status !== 'granted'} onChange={value => setPrefs(previous => ({ ...previous, [type]: { ...previous[type], [key]: value } }))} /></div>)}</div></SettingRow>)}</div></section>
    <section><h2 className={styles.sectionTitle}>Não perturbe</h2><div className={styles.block}><SettingRow title="Não perturbe" description="Prévia do período para silenciar notificações."><Switch label="Não perturbe" checked={dnd} onChange={setDnd} /></SettingRow>{dnd && <SettingRow title="Período"><label>De <input aria-label="Início de Não perturbe" type="time" value={start} onChange={event => setStart(event.target.value)} /></label><label>Até <input aria-label="Fim de Não perturbe" type="time" value={end} onChange={event => setEnd(event.target.value)} /></label></SettingRow>}</div></section>
    {dirty && <div className={styles.save}><span>Prévia não salva</span><Button onClick={() => { setPrefs(initial()); setDnd(false); setStart('22:00'); setEnd('08:00'); }}>Descartar</Button><Button disabled title="Persistência de preferências ainda não disponível">Salvar</Button></div>}
  </div>;
}
