'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Paperclip, Mic, Trash2, Square, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/use-audio-recorder';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  /**
   * Optional handler for sending an image (paste / drag-drop / file picker).
   * If omitted, paste/drop of images is silently ignored — the host panel
   * (chat-panel) decides which conversations support it.
   */
  onSendImage?: (file: File, caption?: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Imperative handle the host panel uses to queue an image from outside the
 * composer — e.g. a drag-and-drop landing on the conversation timeline.
 * Validation + the `isAcceptedImage` helper are exported alongside so the
 * host can short-circuit on rejected files without us double-toasting.
 */
export interface ChatInputHandle {
  queueImage: (file: File) => void;
}

// Allow-list mirrors what the API accepts (UploadsService.ALLOWED_IMAGE_MIME).
// Keep these in sync — any mime here that the API rejects = silent failure
// on the user side.
export const ACCEPTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// 10MB matches UploadsService.MAX_IMAGE_BYTES on the API.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isAcceptedImage(file: File): boolean {
  if (!ACCEPTED_IMAGE_MIMES.has(file.type)) return false;
  if (file.size > MAX_IMAGE_BYTES) return false;
  return true;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  onSendAudio,
  onSendImage,
  disabled,
}, ref) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);

  // Pending image state — set by paste/drop/picker, cleared on send/cancel.
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);
  // Drag-over visual feedback — only true while a drag is hovering the input.
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // Revoke the object URL whenever it changes — leaking URLs holds the blob
  // in memory until the page unloads, which adds up over a long shift.
  useEffect(() => {
    return () => {
      if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    };
  }, [pendingImageUrl]);

  const setPending = useCallback((file: File | null) => {
    setPendingImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPendingImage(file);
  }, []);

  // Imperative API the host (chat-panel) calls when a drag-and-drop lands
  // OUTSIDE the composer — the conversation timeline owns most of the
  // visible chat real estate, so users naturally drop there. We trust the
  // host to have validated (it imports isAcceptedImage from this module).
  useImperativeHandle(ref, () => ({
    queueImage: (file: File) => setPending(file),
  }), [setPending]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSend]);

  const handleSendImage = useCallback(async () => {
    if (!pendingImage || !onSendImage || isSendingImage) return;
    setIsSendingImage(true);
    try {
      const caption = text.trim() || undefined;
      await onSendImage(pendingImage, caption);
      setPending(null);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar imagem',
      );
    } finally {
      setIsSendingImage(false);
    }
  }, [pendingImage, onSendImage, isSendingImage, text, setPending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Image takes precedence — if there's a pending image, Enter sends it
      // (with the textarea as caption). This matches WhatsApp/Telegram UX.
      if (pendingImage && onSendImage) {
        handleSendImage();
      } else {
        handleSubmit();
      }
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  /**
   * Paste handler — scans clipboardData.items for any image and intercepts
   * the paste. Returns early WITHOUT preventDefault when no image is present,
   * so normal text paste still works.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onSendImage) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((it) => it.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      e.preventDefault();
      if (!isAcceptedImage(file)) {
        toast.error(
          file.size > MAX_IMAGE_BYTES
            ? 'Imagem muito grande (máx 10MB)'
            : `Tipo não suportado: ${file.type || 'desconhecido'}`,
        );
        return;
      }
      setPending(file);
    },
    [onSendImage, setPending],
  );

  /**
   * Drag-and-drop handlers — the visual feedback is gated on the host having
   * onSendImage so the user gets no false affordance on conversations that
   * can't send images.
   */
  const handleDragOver = (e: React.DragEvent) => {
    if (!onSendImage) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    if (!onSendImage) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error(
        file.size > MAX_IMAGE_BYTES
          ? 'Imagem muito grande (máx 10MB)'
          : `Tipo não suportado: ${file.type || 'desconhecido'}`,
      );
      return;
    }
    setPending(file);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear immediately so the user can re-select the same file later.
    e.target.value = '';
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error(
        file.size > MAX_IMAGE_BYTES
          ? 'Imagem muito grande (máx 10MB)'
          : `Tipo não suportado: ${file.type || 'desconhecido'}`,
      );
      return;
    }
    setPending(file);
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
        Conversa encerrada — reabra para enviar mensagens
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar áudio"
          >
            {isSendingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button + optional image preview overlay.
  const canRecord = !!onSendAudio;
  const canSendImage = !!onSendImage;
  const showMic = canRecord && !text.trim() && !pendingImage;

  return (
    <div
      className={`border-t border-zinc-200 bg-white p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-950 ${
        isDragging
          ? 'bg-primary/5 ring-2 ring-inset ring-primary/40'
          : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Image preview strip — shown above the textarea when an image is queued. */}
      {pendingImage && pendingImageUrl && (
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImageUrl}
              alt="Pré-visualização da imagem a enviar"
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="truncate">{pendingImage.name || 'imagem.png'}</span>
              <span className="shrink-0">· {(pendingImage.size / 1024).toFixed(0)} KB</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.trim()
                ? 'A imagem será enviada com a legenda abaixo.'
                : 'Adicione uma legenda opcional abaixo ou envie sem texto.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            disabled={isSendingImage}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="Cancelar imagem"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handlePickerChange}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canSendImage || !!pendingImage}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
          aria-label="Anexar imagem"
          title={canSendImage ? 'Anexar imagem' : 'Indisponível nesta conversa'}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={
            pendingImage
              ? 'Legenda (opcional)…'
              : canSendImage
                ? 'Digite uma mensagem ou cole/arraste uma imagem…'
                : 'Digite uma mensagem...'
          }
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {pendingImage ? (
          <button
            onClick={handleSendImage}
            disabled={isSendingImage}
            type="button"
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar imagem"
          >
            {isSendingImage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        ) : showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-1 rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSending}
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        )}
      </div>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
      {isDragging && (
        <p className="mt-1.5 text-center text-xs font-medium text-primary">
          Solte a imagem aqui para anexar
        </p>
      )}
    </div>
  );
});
