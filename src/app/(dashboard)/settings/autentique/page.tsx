import { SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
export default function SettingsPage() { return <div className="space-y-5">
  <section><h2 className={styles.sectionTitle}>Conta</h2><div className={styles.block}><SettingRow title="Conexão com o Autentique"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Contratos</h2><div className={styles.block}><SettingRow title="Pasta padrão"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Marcar o contrato como assinado na negociação"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Avisar na conversa quando todos assinarem"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <p role="status" className={styles.unavailable}>Estas configurações ainda não estão disponíveis nesta tela.</p>
</div>; }
