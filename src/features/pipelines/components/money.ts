import type { CardSummary } from '@/features/pipelines/services/pipelines.service';

export function formatMoney(value: number | string | null, currency: string) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString('pt-BR')} ${currency || '(moeda não informada)'}`;
  }
}

export function currencyTotals(cards: CardSummary[]) {
  const totals = new Map<string, number>();
  for (const card of cards) {
    if (card.value == null || card.value === '' || !Number.isFinite(Number(card.value))) continue;
    totals.set(card.currency, (totals.get(card.currency) ?? 0) + Number(card.value));
  }
  return [...totals].map(([currency, value]) => formatMoney(value, currency)).join(' · ') || 'Sem valor informado';
}
