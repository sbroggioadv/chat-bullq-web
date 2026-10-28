import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChannelCard } from '@/features/channels/components/channel-card';
import type { Channel } from '@/features/channels/services/channels.service';

vi.mock('@/features/channels/hooks/use-channel-sync', () => ({
  useChannelSync: () => ({ supported: false, job: null }),
}));
afterEach(cleanup);
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
    fireEvent.click(screen.getByText('Conexão e sincronização'));
    expect(screen.getByRole('button', { name: 'Reconectar Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerenciar acesso à Agenda' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Autorizar|Reautorizar) Agenda$/ })).not.toBeInTheDocument();
  });
  it('mostra os estados informados pela API, inclusive a negativa explícita', () => {
    render(<ChannelCard channel={{ ...channel, googlePermissions: { hasRead: true, hasSend: false, hasCalendar: true } }} onUpdate={vi.fn()} />);
    expect(screen.getByTitle('Leitura Gmail')).toHaveTextContent('Leitura ✓');
    expect(screen.getByTitle('Envio / reply Gmail')).toHaveTextContent('Envio —');
    expect(screen.getByTitle('Google Agenda')).toHaveTextContent('Agenda ✓');
    fireEvent.click(screen.getByText('Conexão e sincronização'));
    expect(screen.getByRole('button', { name: 'Reautorizar Agenda' })).toBeInTheDocument();
  });
});
