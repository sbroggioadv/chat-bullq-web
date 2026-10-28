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
  return <section className={styles.block} aria-label="Resumo do watchdog">
    <h2 className="sr-only">Resumo do watchdog</h2>
    <SettingRow title={data ? `Últimas 24 horas: ${data.stats.reactivations24h} conversas reativadas` : 'Últimas 24 horas'} description="O monitor fica em Agentes › Watchdog."><Link className="bq-button" href="/ai-agents?tab=watchdog">Abrir monitor</Link></SettingRow>
    {isLoading ? <p role="status" className="p-4">Carregando resumo…</p> : isError || !data ? <p role="alert" className="p-4">Resumo ainda não disponível. Tente novamente mais tarde.</p> : <details className={styles.details}><summary>Verificações e conversas presas</summary>
      <SettingRow title="Verificações" description="Conversas verificadas nas últimas 24 horas."><strong>{data.stats.checks24h}</strong></SettingRow>
      <SettingRow title="Presas agora"><strong>{data.stats.stuck}</strong></SettingRow>
      <SettingRow title="Temporizadores ativos"><strong>{data.stats.activeTimers}</strong></SettingRow>
    </details>}
  </section>;
}
