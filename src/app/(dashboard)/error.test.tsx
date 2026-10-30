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

it('não interrompe uma mutação pendente ao tentar novamente', async () => {
  const client = new QueryClient();
  let finish!: (value: string) => void;
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => new Promise<string>((resolve) => { finish = resolve; }),
  });
  const pending = mutation.execute(undefined);
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const retry = vi.fn();
  render(<QueryClientProvider client={client}><RouteError error={new Error()} retry={retry} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(retry).toHaveBeenCalledOnce();
  finish('concluída');
  await expect(pending).resolves.toBe('concluída');
  vi.restoreAllMocks();
});
