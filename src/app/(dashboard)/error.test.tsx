import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { vi, it, expect } from 'vitest';
import RouteError from './error';

it('remove apenas consultas inativas e tenta imediatamente sem aguardar rede', () => {
  const client = new QueryClient();
  client.setQueryData(['rota'], 'inválido');
  client.setQueryData(['layout'], 'ativo');
  const observer = new QueryObserver(client, { queryKey: ['layout'], queryFn: () => new Promise(() => {}) });
  const unsubscribe = observer.subscribe(() => {});
  const retry = vi.fn();
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<QueryClientProvider client={client}><RouteError error={Object.assign(new Error('dado secreto'), { digest: 'abc' })} retry={retry} /></QueryClientProvider>);
  expect(screen.queryByText('dado secreto')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(retry).toHaveBeenCalledOnce();
  expect(client.getQueryData(['rota'])).toBeUndefined();
  expect(client.getQueryData(['layout'])).toBe('ativo');
  expect(JSON.stringify(log.mock.calls)).not.toContain('dado secreto');
  unsubscribe();
  log.mockRestore();
});
