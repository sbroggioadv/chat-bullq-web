'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { conversationInsightsService } from '@/features/inbox/services/conversation-insights.service';
import { InsightsError, insightBody, insightButton, insightDate, useInsightsScope } from '@/features/inbox/components/contact-panel/insights-shared';

export function ConversationSearch({ conversationId, onJumpToMessage }: { conversationId: string; onJumpToMessage: (id: string) => void | Promise<void> }) {
  const scope = useInsightsScope();
  return <SearchContent key={JSON.stringify([scope, conversationId])} conversationId={conversationId} onJumpToMessage={onJumpToMessage} />;
}
function SearchContent({ conversationId, onJumpToMessage }: { conversationId: string; onJumpToMessage: (id: string) => void | Promise<void> }) {
  const scope = useInsightsScope();
  const [input, setInput] = useState(''); const [query, setQuery] = useState('');
  const [jumpError, setJumpError] = useState<unknown>(null); const [jumping, setJumping] = useState(false);
  const results = useInfiniteQuery({
    queryKey: ['conversation-insights', scope, conversationId, 'search', query], enabled: !!conversationId && query.length >= 2,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => conversationInsightsService.search(conversationId, query, pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
  });
  const items = results.isError ? [] : results.data?.pages.flatMap(page => page.items) ?? [];
  return <div className={insightBody}>
    <form onSubmit={event => { event.preventDefault(); if (input.trim().length >= 2) { setJumpError(null); setQuery(input.trim()); if (query === input.trim()) void results.refetch(); } }}>
      <label className="bq-contact-find !mx-0"><Search size={14} aria-hidden /><input type="search" aria-label="Buscar na conversa" placeholder="Buscar na conversa…" value={input} onChange={event => { setInput(event.target.value); setQuery(''); }} /></label>
      <button type="submit" className={insightButton} disabled={input.trim().length < 2 || results.isFetching}>Buscar</button>
      <p className="mt-2 text-[var(--bq-t3)]">Digite pelo menos dois caracteres.</p>
    </form>
    {results.isFetching && <p role="status">Buscando…</p>}
    {results.isError && <InsightsError error={results.error} retry={() => { void results.refetch(); }} />}
    {jumpError != null && <InsightsError error={jumpError} />}
    {query && results.isSuccess && !items.length && <p>Nenhuma mensagem encontrada.</p>}
    <ul className="space-y-2">{items.map(item => <li key={item.id}>
      <button type="button" disabled={jumping} className="w-full rounded-bq-radius-field bg-[var(--bq-raised)] p-3 text-left break-words" onClick={async () => {
        setJumpError(null); setJumping(true); try { await onJumpToMessage(item.id); } catch (error) { setJumpError(error); } finally { setJumping(false); }
      }}>
        <span className="block text-[var(--bq-t3)]">{item.senderName || (item.direction === 'OUTBOUND' ? 'Equipe' : 'Contato')} · {insightDate(item.createdAt)}</span>
        <span>{item.snippet.slice(0, item.matchStart)}<mark className="bg-[var(--bq-agent-soft)] text-[var(--bq-agent-text)]">{item.snippet.slice(item.matchStart, item.matchStart + item.matchLength)}</mark>{item.snippet.slice(item.matchStart + item.matchLength)}</span>
      </button>
    </li>)}</ul>
    {!results.isError && results.hasNextPage && <button type="button" className={insightButton} disabled={results.isFetching} onClick={() => { void results.fetchNextPage(); }}>Mais resultados</button>}
  </div>;
}
