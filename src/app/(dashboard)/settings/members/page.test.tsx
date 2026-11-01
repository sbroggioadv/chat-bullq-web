import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import SettingsMembersPage from './page';

const invite = vi.fn(async () => ({ token: 'fixture', autoAccepted: false }));
vi.mock('@/features/settings/services/members.service', () => ({ membersService: { list: async () => [], invite: (...args: unknown[]) => invite(...args as []) } }));
vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'fixture-org' }));
vi.mock('@/features/settings/components/member-channels-drawer', () => ({ MemberChannelsDrawer: () => null }));

it('abre o convite em Administrador e permite escolher Atendente', async () => {
  render(<QueryClientProvider client={new QueryClient()}><SettingsMembersPage /></QueryClientProvider>);
  const role = screen.getByRole('combobox', { name: 'Papel do convidado' });
  expect(role).toHaveValue('ADMIN');
  expect(screen.getByText('Use Administrador para quem vai ter o próprio espaço, com os próprios canais. Atendente só opera os canais liberados.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'E-mail para convite' }), { target: { value: 'teste@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Convidar' }));
  await waitFor(() => expect(invite).toHaveBeenCalledWith({ email: 'teste@example.invalid', role: 'ADMIN' }));
  fireEvent.change(role, { target: { value: 'AGENT' } });
  expect(role).toHaveValue('AGENT');
});
