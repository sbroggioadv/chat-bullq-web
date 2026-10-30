import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, it, expect } from 'vitest';
import RouteError from './error';

it('invalida o cache antes da nova tentativa e não expõe o erro', async () => {
  const client = new QueryClient();
  let release!: () => void;
  const invalidation = vi.spyOn(client, 'invalidateQueries').mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
  const retry = vi.fn();
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<QueryClientProvider client={client}><RouteError error={Object.assign(new Error('dado secreto'), { digest: 'abc' })} retry={retry} /></QueryClientProvider>);
  expect(screen.queryByText('dado secreto')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(invalidation).toHaveBeenCalledWith({ refetchType: 'all' });
  expect(retry).not.toHaveBeenCalled();
  release();
  await waitFor(() => expect(retry).toHaveBeenCalledOnce());
  expect(JSON.stringify(log.mock.calls)).not.toContain('dado secreto');
  log.mockRestore();
});
