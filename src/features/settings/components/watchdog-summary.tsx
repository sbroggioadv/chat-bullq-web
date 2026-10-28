'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
export function WatchdogSummary() {
  const orgId = useOrgId();
  const { data, isLoading, isError } = useQuery({ queryKey: ['watchdog-stats', orgId], queryFn: () => aiAgentsService.watchdogStats() });
  return <section><h2 className={styles.sectionTitle}>Últimas 24 horas</h2><div className={styles.block}>
    {isLoading ? <p role="status" className="p-4">Carregando resumo…</p> : isError || !data ? <p role="alert" className="p-4">Resumo ainda não disponível. Tente novamente mais tarde.</p> : <>
      <SettingRow title="Verificações" description="Conversas verificadas nas últimas 24 horas."><strong>{data.stats.checks24h}</strong></SettingRow>
      <SettingRow title="Reativações" description="Atendimentos reativados nas últimas 24 horas."><strong>{data.stats.reactivations24h}</strong></SettingRow>
      <SettingRow title="Presas agora"><strong>{data.stats.stuck}</strong></SettingRow>
      <SettingRow title="Temporizadores ativos"><strong>{data.stats.activeTimers}</strong></SettingRow>
    </>}
    <SettingRow title="Monitor de conversas"><Link className="bq-button" href="/ai-agents?tab=watchdog">Abrir monitor</Link></SettingRow>
  </div></section>;
}
