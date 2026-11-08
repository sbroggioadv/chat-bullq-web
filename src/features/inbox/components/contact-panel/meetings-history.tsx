'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conversationInsightsService, safeExternalUrl } from '@/features/inbox/services/conversation-insights.service';
import { InsightsError, insightBody, insightDate, useInsightsScope } from '@/features/inbox/components/contact-panel/insights-shared';

export function MeetingsHistory({ conversationId }: { conversationId: string }) {
  const scope = useInsightsScope();
  const meetings = useQuery({ queryKey: ['conversation-insights', scope, conversationId, 'meetings'], queryFn: ({ signal }) => conversationInsightsService.meetings(conversationId, signal), retry: false });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const data = meetings.isError ? undefined : meetings.data;
  const groups = [
    { label: 'Próximas', items: (data?.items ?? []).filter(item => new Date(item.end).getTime() >= now).sort((a, b) => a.start.localeCompare(b.start)) },
    { label: 'Passadas', items: (data?.items ?? []).filter(item => new Date(item.end).getTime() < now).sort((a, b) => b.start.localeCompare(a.start)) },
  ];
  return <div className={insightBody}>
    {meetings.isPending && <p role="status">Carregando reuniões…</p>}
    {meetings.isError && <InsightsError error={meetings.error} retry={() => { void meetings.refetch(); }} />}
    {data && <>
      {!data.connected && <p className="text-[var(--bq-warn)]">Google Agenda desconectado. Exibindo o histórico salvo; alterações recentes podem não aparecer.</p>}
      {!data.items.length && <p>Nenhuma reunião vinculada.</p>}
      {groups.map(group => !!group.items.length && <section key={group.label} aria-label={group.label}>
        <h3 className="mb-2 font-medium text-[var(--bq-t1)]">{group.label}</h3>
        <ul className="space-y-3">{group.items.map(item => {
          const link = safeExternalUrl(item.meetLink);
          return <li key={item.eventId} className="space-y-1 rounded-bq-radius-field border border-[var(--bq-hair)] bg-[var(--bq-raised)] p-3 break-words">
            <p className="font-medium text-[var(--bq-t1)]">{item.title}</p>
            <p>{insightDate(item.start)} — {insightDate(item.end)}</p>
            <p className="text-[var(--bq-t3)]">{item.status === 'cancelled' ? 'Cancelada' : item.status === 'confirmed' ? 'Confirmada' : item.status === 'tentative' ? 'Provisória' : item.status}</p>
            {!!item.attendees.length && <p className="break-all">{item.attendees.join(', ')}</p>}
            {link && item.status !== 'cancelled' && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-[var(--bq-agent-text)] underline" aria-label={`Entrar no Meet: ${item.title}`}>Entrar no Meet</a>}
          </li>;
        })}</ul>
      </section>)}
    </>}
  </div>;
}
