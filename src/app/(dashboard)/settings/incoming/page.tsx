import { SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
export default function SettingsPage() { return <div className="space-y-5">
  <section><h2 className={styles.sectionTitle}>O que entra</h2><div className={styles.block}><SettingRow title="Pessoas"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Grupos"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Tipos que o Jarvis identifica</h2><div className={styles.block}><SettingRow title="Pedido de contrato"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Pedido de documento"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Pedido de reunião"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Nunca entram</h2><div className={styles.block}><SettingRow title="Contatos excluídos"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Notificações</h2><div className={styles.block}><SettingRow title="Avisar quando chegar demanda nova"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <p role="status" className={styles.unavailable}>Estas configurações ainda não estão disponíveis nesta tela. Incoming faz parte da próxima onda.</p>
</div>; }
