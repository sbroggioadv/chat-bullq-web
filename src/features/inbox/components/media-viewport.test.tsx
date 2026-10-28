import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaImage } from '@/features/inbox/components/media-bubbles';
import { AudioMessagePlayer } from '@/features/inbox/components/audio-message-player';
import { inboxService, type Message } from '@/features/inbox/services/inbox.service';
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { resolveMediaUrl: vi.fn().mockResolvedValue({ url: 'https://fixture.invalid/image.jpg' }) } }));
let callbacks: IntersectionObserverCallback[];
beforeEach(() => {
  callbacks = [];
  vi.mocked(inboxService.resolveMediaUrl).mockClear();
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); } observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const message = { id: 'fixture', externalId: 'external', type: 'IMAGE', content: { mediaUrl: 'https://mmg.whatsapp.net/a.enc' } } as Message;
it('não resolve imagem fora da tela e resolve ao entrar', async () => {
  render(<MediaImage message={message} isOutbound={false} />);
  expect(inboxService.resolveMediaUrl).not.toHaveBeenCalled();
  act(() => callbacks.forEach((callback) => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)));
  await screen.findByRole('img');
  expect(inboxService.resolveMediaUrl).toHaveBeenCalledTimes(1);
});
it('áudio com URL pronta não recebe src fora da tela', async () => {
  const { container } = render(<AudioMessagePlayer message={{ ...message, type: 'AUDIO', content: { mediaUrl: 'https://fixture.invalid/audio.ogg' } }} isOutbound={false} />);
  expect(container.querySelector('audio')).not.toHaveAttribute('src');
  act(() => callbacks.forEach((callback) => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)));
  await waitFor(() => expect(container.querySelector('audio')).toHaveAttribute('src', 'https://fixture.invalid/audio.ogg'));
});
