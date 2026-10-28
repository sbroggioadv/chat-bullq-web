import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChannelsList } from '@/features/channels/components/channels-list';

const state = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, isError: false, search: '', invalidate: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => state, useQueryClient: () => ({ invalidateQueries: state.invalidate }) }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'test-org' }));
vi.mock('@/features/channels/components/create-channel-dialog', () => ({ CreateChannelDialog: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Criar canal" /> : null }));
afterEach(cleanup);
beforeEach(() => { state.data = []; state.isLoading = false; state.isError = false; state.search = ''; vi.clearAllMocks(); });
it('preserva conectar e acesso à inbox na lista vazia', () => {
  render(<ChannelsList />);
  expect(screen.getByText('Nenhum canal configurado')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Abrir inbox' })).toHaveAttribute('href', '/inbox');
  fireEvent.click(screen.getByRole('button', { name: 'Conectar canal' }));
  expect(screen.getByRole('dialog', { name: 'Criar canal' })).toBeVisible();
});
it('continua abrindo criação automaticamente para convite sem canais', () => {
  state.search = 'onboarding=channels&source=invite'; render(<ChannelsList />);
  expect(screen.getByRole('dialog', { name: 'Criar canal' })).toBeVisible();
});
it('mantém o erro explícito sem apresentar vazio como resultado', () => {
  state.isError = true; render(<ChannelsList />);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os canais');
  expect(screen.queryByText('Nenhum canal configurado')).not.toBeInTheDocument();
});
it('preserva o retorno OAuth e limpa seus parâmetros', () => {
  state.search = 'gmail=connected&updated=1'; window.history.replaceState({}, '', '/settings/channels?gmail=connected&updated=1');
  render(<ChannelsList />);
  expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ['channels'] });
  expect(window.location.search).toBe('');
});
