import { SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
export default function SettingsPage() { return <div className="space-y-5">
  <section><h2 className={styles.sectionTitle}>Conta</h2><div className={styles.block}><SettingRow title="Conexão com o ClickUp"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Para onde vai cada coisa</h2><div className={styles.block}><SettingRow title="Destinos das demandas, projetos e negócios"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <section><h2 className={styles.sectionTitle}>Registrar sozinho</h2><div className={styles.block}><SettingRow title="Comentar no funil quando a negociação muda"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow><SettingRow title="Anexar os arquivos junto"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow></div></section>
  <p role="status" className={styles.unavailable}>Estas configurações ainda não estão disponíveis nesta tela.</p>
</div>; }
