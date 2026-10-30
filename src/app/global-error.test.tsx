import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GlobalError from './global-error';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('funciona sem providers e usa o tema salvo', async () => {
  localStorage.setItem('bullq2-theme-mode', 'dark');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const retry = vi.fn();
  render(<GlobalError error={new Error('privado')} retry={retry} />);
  await waitFor(() => expect(document.documentElement).toHaveAttribute('data-mode', 'dark'));
  expect(screen.queryByText('privado')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(retry).toHaveBeenCalledOnce();
});
it('usa claro quando o armazenamento está inacessível', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<GlobalError error={new Error()} retry={vi.fn()} />);
  expect(document.documentElement).toHaveAttribute('data-mode', 'light');
});
it('define o título do documento global', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<GlobalError error={new Error()} retry={vi.fn()} />);
  expect(document.title).toBe('Chat BullQ — erro');
});
