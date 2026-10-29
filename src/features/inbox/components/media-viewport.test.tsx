import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaImage, MediaVideo, MediaDocument } from '@/features/inbox/components/media-bubbles';
import { AudioMessagePlayer } from '@/features/inbox/components/audio-message-player';
import { inboxService, type Message } from '@/features/inbox/services/inbox.service';
vi.mock('@/features/inbox/services/inbox.service', () => ({ inboxService: { resolveMediaUrl: vi.fn().mockResolvedValue({ url: 'https://fixture.invalid/image.jpg' }) } }));
let callbacks: IntersectionObserverCallback[];
beforeEach(() => {
  callbacks = [];
  vi.mocked(inboxService.resolveMediaUrl).mockClear();
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); } observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const message = { id: 'fixture', externalId: 'external', type: 'IMAGE', content: { mediaUrl: 'https://mmg.whatsapp.net/a.enc' } } as Message;
it.each([MediaImage, MediaVideo, MediaDocument])('legenda de mídia herda a tipografia do balão', (Component) => {
  render(<Component message={{ ...message, content: { ...message.content, caption: 'Legenda longa de mídia' } }} isOutbound={false} />);
  expect(screen.getByText('Legenda longa de mídia')).not.toHaveClass('text-sm');
});
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

const audioUrl = 'https://fixture.invalid/audio.ogg';
function intersectAudio() {
  act(() => callbacks.forEach((callback) => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)));
}
function mockPlayback() {
  return vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    if (!this.getAttribute('src')) return Promise.reject(new Error('missing src'));
    return Promise.resolve();
  });
}
it('áudio QUEUED de saída com URL e externalId nulo toca ao entrar na tela', async () => {
  const play = mockPlayback();
  const view = render(<AudioMessagePlayer message={{ ...message, type: 'AUDIO', direction: 'OUTBOUND', status: 'QUEUED', externalId: null, content: { mediaUrl: audioUrl } }} isOutbound />);
  expect(screen.queryByText(/Áudio indisponível/)).not.toBeInTheDocument();
  expect(view.container.querySelector('audio')).not.toHaveAttribute('src');
  intersectAudio();
  await waitFor(() => expect(view.container.querySelector('audio')).toHaveAttribute('src', audioUrl));
  fireEvent.click(screen.getByRole('button', { name: 'Reproduzir' }));
  await screen.findByRole('button', { name: 'Pausar' });
  expect(play).toHaveBeenCalledTimes(1);
  expect(inboxService.resolveMediaUrl).not.toHaveBeenCalled();
});
it('externalId chegando depois recupera o áudio na mesma montagem', async () => {
  const play = mockPlayback();
  vi.mocked(inboxService.resolveMediaUrl).mockResolvedValueOnce({ url: audioUrl });
  const unavailable = { ...message, type: 'AUDIO' as const, externalId: null, content: {} };
  const view = render(<AudioMessagePlayer message={unavailable} isOutbound />);
  expect(screen.getByText(/Áudio indisponível/)).toBeInTheDocument();
  view.rerender(<AudioMessagePlayer message={{ ...unavailable, externalId: 'arrived' }} isOutbound />);
  intersectAudio();
  fireEvent.click(screen.getByRole('button', { name: 'Reproduzir' }));
  await screen.findByRole('button', { name: 'Pausar' });
  expect(view.container.querySelector('audio')).toHaveAttribute('src', audioUrl);
  expect(play).toHaveBeenCalledTimes(1);
});
it('áudio com URL e externalId nulo toca sem IntersectionObserver', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  const play = mockPlayback();
  const view = render(<AudioMessagePlayer message={{ ...message, type: 'AUDIO', externalId: null, content: { mediaUrl: audioUrl } }} isOutbound />);
  await waitFor(() => expect(view.container.querySelector('audio')).toHaveAttribute('src', audioUrl));
  fireEvent.click(screen.getByRole('button', { name: 'Reproduzir' }));
  await screen.findByRole('button', { name: 'Pausar' });
  expect(play).toHaveBeenCalledTimes(1);
});


it.each([
  ['application/pdf', 'anexo', 'PDF'],
  ['', 'MINUTA.DOCX', 'DOC'],
  ['application/msword', 'anexo', 'DOC'],
])('identifica o documento %s / %s sem antecipar o download', async (mimeType, fileName, badge) => {
  render(<MediaDocument message={{ ...message, type: 'DOCUMENT', content: { mimeType, fileName } }} isOutbound={false} />);
  expect(screen.getByText(badge)).toBeInTheDocument();
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('download', fileName);
  expect(inboxService.resolveMediaUrl).not.toHaveBeenCalled();
  fireEvent.click(link);
  await waitFor(() => expect(inboxService.resolveMediaUrl).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(link).toHaveAttribute('href', 'https://fixture.invalid/image.jpg'));
});
