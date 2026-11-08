'use client';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { conversationInsightsService, type AttachmentKind, type ConversationAttachment } from '@/features/inbox/services/conversation-insights.service';
import { InsightsError, insightBody, insightButton, insightDate, useInsightsScope } from '@/features/inbox/components/contact-panel/insights-shared';

export function AttachmentsSection({ conversationId }: { conversationId: string }) {
  const scope = useInsightsScope();
  return <AttachmentsContent key={JSON.stringify([scope, conversationId])} conversationId={conversationId} />;
}
function AttachmentsContent({ conversationId }: { conversationId: string }) {
  const scope = useInsightsScope(); const [kind, setKind] = useState<AttachmentKind | 'all'>('all');
  const files = useInfiniteQuery({
    queryKey: ['conversation-insights', scope, conversationId, 'attachments', kind],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => conversationInsightsService.attachments(conversationId, kind, pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
  });
  const items = files.isError ? [] : files.data?.pages.flatMap(page => page.items) ?? [];
  return <div className={insightBody}>
    <label className="block">Tipo de anexo<select aria-label="Tipo de anexo" className="mt-1 block w-full rounded-bq-radius-field border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-2" value={kind} onChange={event => setKind(event.target.value as AttachmentKind | 'all')}>
      <option value="all">Todos</option><option value="image">Imagens</option><option value="video">Vídeos</option><option value="audio">Áudios</option><option value="document">Documentos</option>
    </select></label>
    {files.isPending && <p role="status">Carregando anexos…</p>}
    {files.isError && <InsightsError error={files.error} retry={() => { void files.refetch(); }} />}
    {files.isSuccess && !items.length && <p>Nenhum anexo encontrado.</p>}
    <ul className="space-y-3">{items.map(item => <li key={item.messageId}><Attachment item={item} /></li>)}</ul>
    {!files.isError && files.hasNextPage && <button type="button" className={insightButton} disabled={files.isFetching} onClick={() => { void files.fetchNextPage(); }}>Mais anexos</button>}
  </div>;
}
function Attachment({ item }: { item: ConversationAttachment }) {
  const filename = item.fileName || 'Anexo';
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const scope = useInsightsScope(); const [downloadError, setDownloadError] = useState<unknown>(null); const [downloading, setDownloading] = useState(false);
  const media = useQuery({ queryKey: ['conversation-insights', scope, 'media', item.messageId], queryFn: () => conversationInsightsService.resolveMedia(item.messageId), retry: false });
  return <article className="space-y-2 rounded-bq-radius-field border border-[var(--bq-hair)] bg-[var(--bq-raised)] p-3">
    <p className="break-all font-medium text-[var(--bq-t1)]">{filename}</p>
    <p className="text-[var(--bq-t3)]">{insightDate(item.createdAt)}{item.sizeBytes !== null ? ` · ${new Intl.NumberFormat('pt-BR').format(item.sizeBytes)} bytes` : ''}</p>
    {media.isPending && <p role="status">Preparando anexo…</p>}
    {media.isError && <InsightsError error={media.error} retry={() => { void media.refetch(); }} />}
    {!media.isError && media.data && <>
      {/* Native image supports provider URLs without sending API credentials. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.kind === 'image' && !thumbnailFailed && <img className="max-h-40 max-w-full rounded-bq-radius-field object-contain" src={media.data.url} alt={filename} loading="lazy" onError={() => setThumbnailFailed(true)} />}
      {thumbnailFailed && <InsightsError error={new Error('Não foi possível exibir a miniatura.')} retry={() => { setThumbnailFailed(false); void media.refetch(); }} />}
      <div className="flex flex-wrap gap-2">
        <a className={insightButton} href={media.data.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${filename}`}>Abrir</a>
        <button type="button" className={insightButton} disabled={downloading} aria-label={`Baixar ${filename}`} onClick={async () => {
          setDownloadError(null); setDownloading(true); try { await conversationInsightsService.download(item.messageId, filename); } catch (error) { setDownloadError(error); } finally { setDownloading(false); }
        }}>{downloading ? 'Baixando…' : 'Baixar'}</button>
      </div>
    </>}
    {downloadError != null && <InsightsError error={downloadError} />}
  </article>;
}
