import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { channelsService } from '@/features/channels/services/channels.service';
import { ChannelCard } from '@/features/channels/components/channel-card';
import type { Channel } from '@/features/channels/services/channels.service';

vi.mock('@/features/channels/hooks/use-channel-sync', () => ({
  useChannelSync: () => ({ supported: false, job: null }),
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const channel: Channel = {
  id: 'test-channel', organizationId: 'test-org', name: 'Gmail de teste', type: 'GMAIL',
  isActive: true, visibility: 'PRIVATE', aiEnabled: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
};

describe('permissões Google no cartão do canal', () => {
  it.each([undefined, null])('omite os três selos quando o objeto é %s', googlePermissions => {
    render(<ChannelCard channel={{ ...channel, googlePermissions }} onUpdate={vi.fn()} />);
    for (const title of ['Leitura Gmail', 'Envio / reply Gmail', 'Google Agenda']) {
      expect(screen.queryByTitle(title)).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    expect(screen.getByRole('button', { name: 'Reconectar Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerenciar acesso à Agenda' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Autorizar|Reautorizar) Agenda$/ })).not.toBeInTheDocument();
  });
  it('mostra os estados informados pela API, inclusive a negativa explícita', () => {
    render(<ChannelCard channel={{ ...channel, googlePermissions: { hasRead: true, hasSend: false, hasCalendar: true } }} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    expect(screen.getByTitle('Leitura Gmail')).toHaveTextContent('Leitura ✓');
    expect(screen.getByTitle('Envio / reply Gmail')).toHaveTextContent('Envio —');
    expect(screen.getByTitle('Google Agenda')).toHaveTextContent('Agenda ✓');
    expect(screen.getByRole('button', { name: 'Reautorizar Agenda' })).toBeInTheDocument();
  });
});

describe('edição de canal em linha', () => {
  it.each(['PRIVATE', 'ORG'] as const)('mostra visibilidade %s sem prometer conexão', visibility => {
    render(<ChannelCard channel={{ ...channel, visibility }} onUpdate={vi.fn()} />);
    expect(screen.getByText(/quem vê:/)).toHaveTextContent(visibility === 'PRIVATE' ? 'Membros com permissão' : 'Toda a equipe');
    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.queryByText('Conectado')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  it('abre pelo teclado, salva só o nome e devolve foco ao acionador', async () => {
    const update = vi.spyOn(channelsService, 'update').mockResolvedValue(channel);
    const onUpdate = vi.fn(); const user = userEvent.setup();
    render(<ChannelCard channel={channel} onUpdate={onUpdate} />);
    const edit = screen.getByRole('button', { name: 'Editar', exact: true });
    edit.focus(); await user.keyboard('{Enter}');
    expect(edit).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: 'Editar Gmail de teste' });
    const input = within(region).getByRole('textbox', { name: 'Nome', exact: true });
    expect(input).toHaveFocus();
    await user.clear(input); await user.type(input, '  Novo canal  ');
    await user.click(within(region).getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(channel.id, { name: 'Novo canal' }));
    expect(onUpdate).toHaveBeenCalledOnce(); expect(edit).toHaveFocus();
    expect(edit).toHaveAttribute('aria-expanded', 'false');
  });
  it('cancelamento e nome inalterado não enviam PATCH', async () => {
    const update = vi.spyOn(channelsService, 'update'); const user = userEvent.setup();
    render(<ChannelCard channel={channel} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    await user.type(screen.getByRole('textbox', { name: 'Nome', exact: true }), ' rascunho');
    await user.click(screen.getByRole('button', { name: 'Cancelar', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    expect(screen.getByRole('textbox', { name: 'Nome', exact: true })).toHaveValue(channel.name);
    await user.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    expect(update).not.toHaveBeenCalled();
  });
  it('erro conserva rascunho e ações existentes na região aberta', async () => {
    vi.spyOn(channelsService, 'update').mockRejectedValue(new Error('Falha de teste'));
    const user = userEvent.setup(); render(<ChannelCard channel={channel} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    const input = screen.getByRole('textbox', { name: 'Nome', exact: true });
    await user.clear(input); await user.type(input, 'Rascunho');
    await user.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled());
    expect(input).toHaveValue('Rascunho');
    for (const name of ['Testar Conexão', 'Reconectar Google', 'Ver e-mails na inbox', 'Desativar', 'Editar credenciais', 'Tornar público na org', 'Remover']) expect(screen.getByRole('button', { name })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir inbox' })).toHaveAttribute('href','/inbox');
  });
});
