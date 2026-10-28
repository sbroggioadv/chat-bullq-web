import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { MacWindow, SegmentedControl, Sheet, Switch } from '@/components/ui/foundation';

function Controls() {
  const [checked, setChecked] = useState(false);
  const [value, setValue] = useState('all');
  return <><Switch label="Ativar IA" checked={checked} onChange={setChecked} /><SegmentedControl label="Conversas" value={value} onChange={setValue} options={[{ label: 'Todas', value: 'all' }, { label: 'Grupos', value: 'groups' }]} /></>;
}

describe('Fundação SPEC-010', () => {
  it('altera switch e seleção pelo teclado com estado acessível', async () => {
    const user = userEvent.setup();
    render(<Controls />);
    await user.tab();
    expect(screen.getByRole('switch', { name: 'Ativar IA' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: 'Grupos' }));
    expect(screen.getByRole('button', { name: 'Grupos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('fecha sheet por Escape', async () => {
    const close = vi.fn();
    render(<Sheet open onClose={close} title="Detalhes">Conteúdo</Sheet>);
    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('não oferece minimizar ou maximizar como ações sem handler', async () => {
    const close = vi.fn();
    render(<MacWindow open onClose={close} title="Caso">Conteúdo</MacWindow>);
    expect(screen.getByRole('button', { name: 'Minimizar janela' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Maximizar janela' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar janela' }));
    expect(close).toHaveBeenCalledOnce();
  });
  it('preserva o título e os controles da janela sem criar banner dentro do diálogo', () => {
    render(<MacWindow open onClose={vi.fn()} title="Tarefas do projeto">Conteúdo</MacWindow>);
    const dialog = screen.getByRole('dialog', { name: 'Tarefas do projeto' });
    expect(within(dialog).getByRole('heading', { name: 'Tarefas do projeto' })).toBeVisible();
    expect(within(dialog).queryByRole('banner')).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('button')).toEqual([
      within(dialog).getByRole('button', { name: 'Fechar janela' }),
      within(dialog).getByRole('button', { name: 'Minimizar janela' }),
      within(dialog).getByRole('button', { name: 'Maximizar janela' }),
    ]);
  });
});
