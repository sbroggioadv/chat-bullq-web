import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { RouteErrorState } from './route-error-state';

it('focaliza o título e segue para a tentativa ao pressionar Tab', async () => {
  const user = userEvent.setup();
  render(<RouteErrorState onRetry={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Esta tela não carregou.' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toHaveFocus();
});
