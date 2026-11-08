'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationInsightsService } from '@/features/inbox/services/conversation-insights.service';
import { InsightsError, insightBody, insightButton, insightDate, useInsightsScope } from '@/features/inbox/components/contact-panel/insights-shared';

export function SummarySection({ conversationId }: { conversationId: string }) {
  const scope = useInsightsScope();
  return <SummaryContent key={JSON.stringify([scope, conversationId])} conversationId={conversationId} />;
}
function SummaryContent({ conversationId }: { conversationId: string }) {
  const scope = useInsightsScope(); const client = useQueryClient();
  const key = ['conversation-insights', scope, conversationId, 'summary'];
  const summary = useQuery({ queryKey: key, queryFn: ({ signal }) => conversationInsightsService.summary(conversationId, signal), retry: false });
  const generate = useMutation({
    mutationFn: (force: boolean) => conversationInsightsService.generateSummary(conversationId, force), retry: false,
    onSuccess: result => client.setQueryData(key, result),
  });
  const data = summary.data;
  return <div className={insightBody}>
    {summary.isPending && <p role="status">Carregando resumo…</p>}
    {summary.isError ? <InsightsError error={summary.error} retry={() => { void summary.refetch(); }} /> : <>
      {data ? <>
        {data.stale && <p className="text-[var(--bq-warn)]">Resumo desatualizado: chegaram novas mensagens.</p>}
        <dl className="bq-contact-summary !mx-0">{([
          ['assunto', 'Assunto'], ['situacao', 'Situação'], ['pendencias', 'Pendências'], ['proximoPasso', 'Próximo passo'],
        ] as const).map(([field, title]) => <div key={field} className="mb-2 last:mb-0"><dt className="font-medium text-[var(--bq-agent-text)]">{title}</dt><dd className="whitespace-pre-wrap break-words">{data.sections[field] || 'Não informado'}</dd></div>)}</dl>
        <p className="text-[var(--bq-t3)]">{insightDate(data.generatedAt)} · {data.messageCount} mensagens</p>
      </> : !summary.isPending && <p>Nenhum resumo gerado.</p>}
      <button type="button" className={insightButton} disabled={summary.isPending || generate.isPending || !conversationId} onClick={() => generate.mutate(!!data)}>{generate.isPending ? 'Gerando resumo…' : data ? 'Atualizar resumo' : 'Gerar resumo'}</button>
    </>}
    {generate.isError && <InsightsError error={generate.error} />}
  </div>;
}
