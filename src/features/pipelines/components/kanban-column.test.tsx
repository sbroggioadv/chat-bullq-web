import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KanbanColumn } from '@/features/pipelines/components/kanban-column';
import { KanbanCard } from '@/features/pipelines/components/kanban-card';
import { currencyTotals } from '@/features/pipelines/components/money';
import type { CardSummary, PipelineStage } from '@/features/pipelines/services/pipelines.service';
vi.mock('@dnd-kit/core', () => ({ useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }), useDraggable: () => ({ setNodeRef: vi.fn(), attributes: {}, listeners: {} }) }));
const card = { id: 'card', title: 'Título da negociação', currency: 'USD', value: 100, status: 'OPEN', contact: { name: 'Contato real', phone: null, avatarUrl: null } } as CardSummary;
describe('Cores e moedas do quadro', () => {
  it.each([['zinc', 't3'], ['blue', 'info'], ['amber', 'warn'], ['green', 'ok'], ['red', 'err'], ['violet', 'agent'], ['pink', 'ig']])('restaura borda e contador de %s', (color, token) => {
    const { container } = render(<KanbanColumn stage={{ id: 'stage', color, name: 'Etapa' } as PipelineStage} cards={[]} onAddCard={vi.fn()} onCardClick={vi.fn()} />);
    expect(container.firstElementChild?.getAttribute('style')).toContain(`var(--bq-${token}`);
    expect(screen.getByText('0').getAttribute('style')).toContain(`var(--bq-${token}`);
  });
  it('formata o card na moeda recebida e apresenta contato antes do título', () => {
    render(<KanbanCard card={card} />);
    expect(screen.getByText(/US\$/)).toHaveTextContent('100,00');
    expect(screen.getByText('Contato real').compareDocumentPosition(screen.getByText(card.title)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('mantém separados BRL, USD e EUR inclusive na coluna', () => {
    const cards = [card, { ...card, id: 'brl', currency: 'BRL', value: 200 }, { ...card, id: 'eur', currency: 'EUR', value: 300 }];
    expect(currencyTotals(cards)).toMatch(/US\$.*100,00.*R\$.*200,00.*€.*300,00/);
    render(<KanbanColumn stage={{ id: 'stage', name: 'Etapa' } as PipelineStage} cards={cards} onAddCard={vi.fn()} onCardClick={vi.fn()} />);
    expect(screen.getByLabelText('Total da etapa')).toHaveTextContent(currencyTotals(cards).replace(/\s/g, ' '));
    expect(screen.getByLabelText('Total da etapa')).not.toHaveTextContent('600');
  });
});
