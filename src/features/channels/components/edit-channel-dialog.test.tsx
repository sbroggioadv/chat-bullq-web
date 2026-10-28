import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditChannelDialog } from '@/features/channels/components/edit-channel-dialog';
import { api } from '@/lib/api';
import type { Channel } from '@/features/channels/services/channels.service';
vi.mock('@/lib/api', () => ({ api: { patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const channel = { id: 'channel', name: 'Canal', type: 'WHATSAPP_ZAPPFY', configFields: { token: true } } as unknown as Channel;
beforeEach(() => { vi.mocked(api.patch).mockResolvedValue({ data: { data: channel } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = () => render(<EditChannelDialog channel={channel} onClose={vi.fn()} onSaved={vi.fn()} />);
describe('PATCH de canal preserva credenciais omitidas', () => {
  it.each([
    ['WHATSAPP_OFFICIAL', ['phoneNumberId', 'businessAccountId'], ['accessToken', 'appSecret']],
    ['INSTAGRAM', ['igBusinessId', 'igAppId'], ['accessToken', 'appSecret']],
    ['GMAIL', ['email', 'clientId', 'query'], ['refreshToken', 'clientSecret']],
    ['WHATSAPP_ZAPPFY', [], ['token']],
  ] as const)('%s mostra entradas públicas e mascara apenas segredos, sem preencher valores salvos', async (type, publicFields, secretFields) => {
    render(<EditChannelDialog channel={{ ...channel, type, configFields: Object.fromEntries([...publicFields, ...secretFields].map(key => [key, true])) }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByLabelText('Nome do canal');
    for (const [keys, inputType] of [[publicFields, 'text'], [secretFields, 'password']] as const) {
      for (const key of keys) {
        const input = document.getElementById(`channel-${key}`)!;
        expect(input).toHaveAttribute('type', inputType);
        expect(input).toHaveValue('');
        fireEvent.change(input, { target: { value: 'valor-de-teste' } });
        fireEvent.change(input, { target: { value: '' } });
      }
    }
    fireEvent.change(screen.getByLabelText('Ação do Webhook Secret'), { target: { value: 'replace' } });
    expect(screen.getByLabelText('Novo Webhook Secret')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Novo Webhook Secret')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Ação do Webhook Secret'), { target: { value: 'keep' } });
    fireEvent.change(screen.getByLabelText('Nome do canal'), { target: { value: 'Renomeado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { name: 'Renomeado' }));
  });
  it('editar só nome envia somente name', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Nome do canal'), { target: { value: 'Novo nome' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { name: 'Novo nome' }));
  });
  it('editar um campo envia apenas aquela chave e omite webhookSecret', async () => {
    open();
    fireEvent.change(await screen.findByLabelText(/Token · Preenchido/), { target: { value: 'novo-token-de-teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { config: { token: 'novo-token-de-teste' } }));
  });
  it('segredo só muda por ação explícita e limpar envia null', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Ação do Webhook Secret'), { target: { value: 'clear' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { webhookSecret: null }));
  });
  it('trocar segredo vazio não permite salvar nem envia string vazia', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Ação do Webhook Secret'), { target: { value: 'replace' } });
    expect(screen.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Novo Webhook Secret'), { target: { value: 'segredo-de-teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { webhookSecret: 'segredo-de-teste' }));
  });
  it('limpa somente a chave opcional escolhida', async () => {
    render(<EditChannelDialog channel={{ ...channel, type: 'GMAIL', configFields: { query: true } }} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Limpar Filtro Gmail (query)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/channels/channel', { config: { query: null } }));
  });
  it('campo omitido aparece vazio e descartar edição não envia PATCH', async () => {
    render(<EditChannelDialog channel={{ ...channel, configFields: {} }} onClose={vi.fn()} onSaved={vi.fn()} />);
    const input = await screen.findByLabelText(/Token · Vazio/);
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.change(input, { target: { value: 'novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manter valor salvo' }));
    expect(screen.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

});
