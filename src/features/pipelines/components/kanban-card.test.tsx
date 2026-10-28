import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KanbanCard } from '@/features/pipelines/components/kanban-card';
import type { CardSummary } from '@/features/pipelines/services/pipelines.service';

const drag = vi.hoisted(() => vi.fn());
vi.mock('@dnd-kit/core', () => ({ useDraggable: () => ({ attributes: {}, listeners: { onPointerDown: drag }, setNodeRef: vi.fn() }) }));
const card = { id: 'c1', title: 'Revisão do contrato', value: 125, currency: 'EUR', status: 'OPEN', contact: { name: 'Marina Almeida', avatarUrl: null }, conversationId: 'conv', conversation: { channel: { type: 'WHATSAPP_ZAPPFY', name: 'WhatsApp escritório' } }, assignedTo: { name: 'Luís', avatarUrl: null } } as CardSummary;

describe('Card fiel ao quadro', () => {
  it('abre por clique e teclado e permite arrastar pela superfície sem alça extra', async () => {
    const open = vi.fn(); render(<KanbanCard card={card} onClick={open} />);
    const button = screen.getByRole('button', { name: 'Abrir Revisão do contrato' });
    await userEvent.click(button);
    expect(open).toHaveBeenCalledOnce();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    expect(open).toHaveBeenCalledTimes(3);
    drag.mockClear(); fireEvent.pointerDown(button, { pointerId: 1 });
    expect(drag).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Arrastar' })).not.toBeInTheDocument();
  });
  it('canal acompanha avatar, responsável e vínculo ficam no cabeçalho; moeda real no rodapé', () => {
    const { container } = render(<KanbanCard card={card} />);
    const header = container.querySelector('[data-card-header]') as HTMLElement;
    expect(within(header).getByText('Marina Almeida')).toBeVisible();
    expect(within(header).getByTitle('Responsável: Luís')).toBeVisible();
    expect(within(header).getByLabelText('Tem conversa vinculada')).toBeVisible();
    expect(screen.getByLabelText('Canal: WhatsApp escritório').closest('[data-contact-avatar]')).not.toBeNull();
    expect(screen.getByText(/125,00/)).toHaveTextContent('€');
  });
  it('preserva título sem contato e motivo real da perda sem criar tags ou jornada', () => {
    render(<KanbanCard card={{ ...card, contact: null, status: 'LOST', closedReason: 'Prazo incompatível' }} />);
    expect(screen.getAllByText(card.title)).toHaveLength(1);
    expect(screen.getByText('Motivo: Prazo incompatível')).toBeVisible();
    expect(screen.queryByText('Diagnóstico')).not.toBeInTheDocument();
  });
});
