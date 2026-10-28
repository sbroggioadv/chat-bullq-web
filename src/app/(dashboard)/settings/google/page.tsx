import Link from 'next/link';
import styles from '@/features/settings/components/settings.module.css';
import { SettingRow } from '@/components/ui/foundation';
export default function GoogleSettingsPage() { return <div className="space-y-5">
  <section className={styles.block}><h2 className="sr-only">Conexão Google</h2><SettingRow title="Conta Google" description="Conecte, reconecte ou autorize a Agenda pelo canal Gmail."><Link href="/settings/channels" className="bq-button">Abrir Canais</Link></SettingRow></section>
  <section><h2 className={styles.sectionTitle}>Agenda e Meet</h2><div className={styles.block}>
    <SettingRow title="Agenda e reuniões" description="Consulte os eventos e reuniões disponíveis."><Link href="/calendar" className="bq-button">Abrir Agenda</Link></SettingRow>
    <SettingRow title="Link do Meet, agenda e duração padrão"><span className={styles.unavailable}>Preferências ainda não disponíveis</span></SettingRow>
  </div></section>
  <section><h2 className={styles.sectionTitle}>Gmail</h2><div className={styles.block}><SettingRow title="Filtro, envio e sincronização" description="Gerencie o filtro, as permissões e a sincronização no canal Gmail."><Link href="/settings/channels" className="bq-button">Gerenciar canal</Link></SettingRow></div></section>
</div>; }
