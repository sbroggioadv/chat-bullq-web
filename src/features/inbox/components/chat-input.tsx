'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Trash2,
  Square,
  Loader2,
  ImageIcon,
  FileText,
  FileArchive,
  Video,
  Music,
  File as FileIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { ComposerAutocomplete, type AutocompleteItem } from './composer-autocomplete';
import { useQuickReplyTrigger } from '../hooks/use-quick-reply-trigger';
import { useQuickReplies } from '@/features/quick-replies/hooks/use-quick-replies';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  /**
   * Optional handler for sending an image (paste / drag-drop / file picker).
   * If omitted, paste/drop of images is silently ignored — the host panel
   * (chat-panel) decides which conversations support it.
   */
  onSendImage?: (file: File, caption?: string) => Promise<void>;
  /**
   * S18/W3-Z: polymorphic file handler. Accepts ANY type (image/audio/video/
   * document). When defined, takes precedence over onSendImage for drag-drop
   * and file picker (paste still goes through onSendImage for image-only to
   * preserve clipboard pattern). Host decides at chat-panel level.
   */
  onSendFile?: (file: File, caption?: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Imperative handle the host panel uses to queue an attachment from outside
 * the composer — e.g. a drag-and-drop landing on the conversation timeline.
 * `queueImage` kept for backward compat (still works); `queueFile` is the
 * polymorphic variant W3-Z added.
 */
export interface ChatInputHandle {
  queueImage: (file: File) => void;
  queueFile: (file: File) => void;
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

// S18/W3-Z: caps mirror UploadsService on the API. Validate UI-side to fail
// fast without round-tripping a 50MB PDF that's gonna get rejected anyway.
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const ACCEPTED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

export const ACCEPTED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-matroska',
]);

export const ACCEPTED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'text/plain',
  'text/csv',
  'application/json',
]);

export function isAcceptedImage(file: File): boolean {
  if (!ACCEPTED_IMAGE_MIMES.has(file.type)) return false;
  if (file.size > MAX_IMAGE_BYTES) return false;
  return true;
}

export type FileBucket = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

export function detectBucket(file: File): FileBucket | null {
  const mime = (file.type || '').toLowerCase();
  if (ACCEPTED_IMAGE_MIMES.has(mime)) return 'IMAGE';
  if (ACCEPTED_AUDIO_MIMES.has(mime) || mime.startsWith('audio/')) return 'AUDIO';
  if (ACCEPTED_VIDEO_MIMES.has(mime)) return 'VIDEO';
  if (ACCEPTED_DOCUMENT_MIMES.has(mime) || mime.startsWith('text/')) return 'DOCUMENT';
  return null;
}

/**
 * S18/W3-Z: validates a polymorphic attachment. Returns an error message
 * when invalid (so caller can toast), null when accepted.
 */
export function validateFile(file: File): string | null {
  const bucket = detectBucket(file);
  if (!bucket) return `Tipo não suportado: ${file.type || 'desconhecido'}`;
  if (file.size > MAX_FILE_BYTES) return 'Arquivo muito grande (máx 100MB)';
  const cap =
    bucket === 'IMAGE'
      ? MAX_IMAGE_BYTES
      : bucket === 'AUDIO'
        ? MAX_AUDIO_BYTES
        : bucket === 'VIDEO'
          ? MAX_VIDEO_BYTES
          : MAX_DOCUMENT_BYTES;
  if (file.size > cap) {
    const mb = cap / 1024 / 1024;
    return `${bucket === 'IMAGE' ? 'Imagem' : bucket === 'AUDIO' ? 'Áudio' : bucket === 'VIDEO' ? 'Vídeo' : 'Documento'} muito grande (máx ${mb}MB)`;
  }
  return null;
}

function iconForBucket(bucket: FileBucket | null) {
  switch (bucket) {
    case 'IMAGE':
      return ImageIcon;
    case 'AUDIO':
      return Music;
    case 'VIDEO':
      return Video;
    case 'DOCUMENT':
      return FileText;
    default:
      return FileIcon;
  }
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  onSendAudio,
  onSendImage,
  onSendFile,
  disabled,
}, ref) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);

  // S18/W3-Z: pendingAttachment substitui pendingImage (este vira alias quando bucket=IMAGE).
  // Set by paste/drop/picker, cleared on send/cancel.
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  // Drag-over visual feedback — only true while a drag is hovering the input.
  const [isDragging, setIsDragging] = useState(false);

  // Aliases pra compat com call sites antigos que falavam "image" especificamente.
  const pendingBucket = pendingAttachment ? detectBucket(pendingAttachment) : null;
  const pendingImage = pendingBucket === 'IMAGE' ? pendingAttachment : null;
  const pendingImageUrl = pendingBucket === 'IMAGE' ? pendingPreviewUrl : null;
  const isSendingImage = isSendingAttachment;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // S21/W1: Quick Replies trigger + autocomplete
  const { data: quickReplies = [] } = useQuickReplies();
  const trigger = useQuickReplyTrigger(textareaRef, text);

  useEffect(() => {
    trigger.recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const quickReplyItems: AutocompleteItem[] = quickReplies.map((qr) => ({
    id: qr.id,
    primary: `/${qr.shortcut}`,
    secondary: qr.title,
  }));

  const handleSelectQuickReply = (item: AutocompleteItem) => {
    const qr = quickReplies.find((q) => q.id === item.id);
    if (!qr) return;
    trigger.replace(qr.content, (next, cursor) => {
      setText(next);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursor, cursor);
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 160) + 'px';
      });
    });
  };

  // Revoke the object URL whenever it changes — leaking URLs holds the blob
  // in memory until the page unloads, which adds up over a long shift.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const setPending = useCallback((file: File | null) => {
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      // Só geramos preview pra IMAGE — outros tipos mostram ícone, não thumb.
      if (!file) return null;
      const bucket = detectBucket(file);
      return bucket === 'IMAGE' ? URL.createObjectURL(file) : null;
    });
    setPendingAttachment(file);
  }, []);

  // Imperative API the host (chat-panel) calls when a drag-and-drop lands
  // OUTSIDE the composer — the conversation timeline owns most of the
  // visible chat real estate, so users naturally drop there. queueFile é o
  // polimórfico W3-Z; queueImage mantido por compat (apenas verifica image).
  useImperativeHandle(ref, () => ({
    queueImage: (file: File) => setPending(file),
    queueFile: (file: File) => setPending(file),
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

  const handleSendAttachment = useCallback(async () => {
    if (!pendingAttachment || isSendingAttachment) return;
    // S18/W3-Z: onSendFile (polimorfico) tem precedencia. Quando ausente
    // e bucket=IMAGE, cai pro onSendImage legado por compat. Outros tipos
    // sem onSendFile = no-op (host nao habilitou drag-drop polimorfico).
    const bucket = detectBucket(pendingAttachment);
    const handler = onSendFile ?? (bucket === 'IMAGE' ? onSendImage : null);
    if (!handler) return;
    setIsSendingAttachment(true);
    try {
      const caption = text.trim() || undefined;
      await handler(pendingAttachment, caption);
      setPending(null);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar anexo',
      );
    } finally {
      setIsSendingAttachment(false);
    }
  }, [pendingAttachment, onSendFile, onSendImage, isSendingAttachment, text, setPending]);

  // Alias mantido pra compat com lugares que ainda chamam "image" diretamente.
  const handleSendImage = handleSendAttachment;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (trigger.open && (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Attachment takes precedence — Enter sends the queued attachment (with
      // the textarea as caption). Matches WhatsApp/Telegram UX.
      if (pendingAttachment) {
        handleSendAttachment();
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
   * Paste handler — clipboard quase sempre tem imagem (screenshot). Pra
   * documents/video/audio o usuario usa drag-drop ou file picker.
   * Quando onSendFile esta disponivel mas onSendImage nao, paste de imagem
   * ainda funciona (cai no onSendFile com bucket=IMAGE).
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onSendImage && !onSendFile) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((it) => it.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      e.preventDefault();
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }
      setPending(file);
    },
    [onSendImage, onSendFile, setPending],
  );

  /**
   * S18/W3-Z: drag-and-drop polimorfico — accepts any file type when
   * onSendFile is provided. Otherwise falls back to image-only (legacy).
   */
  const acceptsAnyFile = !!onSendFile;
  const canShowAttachUi = acceptsAnyFile || !!onSendImage;

  const handleDragOver = (e: React.DragEvent) => {
    if (!canShowAttachUi) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    if (!canShowAttachUi) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // No modo polimorfico aceita qualquer tipo valido; no modo legacy so imagem.
    const err = acceptsAnyFile ? validateFile(file) : (isAcceptedImage(file) ? null : `Tipo não suportado: ${file.type || 'desconhecido'}`);
    if (err) {
      toast.error(err);
      return;
    }
    setPending(file);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear immediately so the user can re-select the same file later.
    e.target.value = '';
    if (!file) return;
    const err = acceptsAnyFile ? validateFile(file) : (isAcceptedImage(file) ? null : `Tipo não suportado: ${file.type || 'desconhecido'}`);
    if (err) {
      toast.error(err);
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

  // IDLE MODE: text input + mic button + optional attachment preview overlay.
  const canRecord = !!onSendAudio;
  const canSendImage = !!onSendImage || !!onSendFile;
  const showMic = canRecord && !text.trim() && !pendingAttachment;
  const PreviewIcon = iconForBucket(pendingBucket);
  // Accept attribute do file picker: amplo no modo polimorfico, restrito a imagem no legacy.
  const fileAccept = acceptsAnyFile
    ? 'image/*,audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,text/plain,text/csv,application/json'
    : 'image/jpeg,image/png,image/gif,image/webp';

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
      {/* S18/W3-Z: attachment preview strip — adapts visual to bucket. */}
      {pendingAttachment && (
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="relative shrink-0">
            {pendingBucket === 'IMAGE' && pendingPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingPreviewUrl}
                alt="Pré-visualização do anexo a enviar"
                className="h-20 w-20 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                <PreviewIcon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <PreviewIcon className="h-3.5 w-3.5" />
              <span className="truncate">{pendingAttachment.name || 'anexo'}</span>
              <span className="shrink-0">
                · {pendingAttachment.size > 1024 * 1024
                  ? `${(pendingAttachment.size / 1024 / 1024).toFixed(1)} MB`
                  : `${(pendingAttachment.size / 1024).toFixed(0)} KB`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.trim()
                ? 'O anexo será enviado com a legenda abaixo.'
                : 'Adicione uma legenda opcional abaixo ou envie sem texto.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            disabled={isSendingAttachment}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="Cancelar anexo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={handlePickerChange}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canSendImage || !!pendingAttachment}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
          aria-label={acceptsAnyFile ? 'Anexar arquivo' : 'Anexar imagem'}
          title={canSendImage ? (acceptsAnyFile ? 'Anexar arquivo' : 'Anexar imagem') : 'Indisponível nesta conversa'}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <ComposerAutocomplete
            open={trigger.open}
            query={trigger.query}
            items={quickReplyItems}
            onSelect={handleSelectQuickReply}
            onClose={trigger.close}
            emptyLabel="Nenhum atalho — cadastre em Configurações"
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            onSelect={() => trigger.recompute()}
            placeholder={
              pendingAttachment
                ? 'Legenda (opcional)…'
                : canSendImage
                  ? acceptsAnyFile
                    ? 'Digite uma mensagem ou arraste/cole um arquivo…'
                    : 'Digite uma mensagem ou cole/arraste uma imagem…'
                  : 'Digite uma mensagem...'
            }
            rows={1}
            className="max-h-40 min-h-[40px] w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        {pendingAttachment ? (
          <button
            onClick={handleSendAttachment}
            disabled={isSendingAttachment}
            type="button"
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar anexo"
          >
            {isSendingAttachment ? (
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
          {acceptsAnyFile ? 'Solte o arquivo aqui para anexar' : 'Solte a imagem aqui para anexar'}
        </p>
      )}
    </div>
  );
});
