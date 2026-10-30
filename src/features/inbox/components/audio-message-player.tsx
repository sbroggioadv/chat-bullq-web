'use client';

import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';

import { useVisible } from '@/features/inbox/hooks/use-visible';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Loader2, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { inboxService, type Message, type TranscriptionResult } from '@/features/inbox/services/inbox.service';

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Audio player with playback-rate control and on-demand transcription.
 *
 * Why a custom player instead of <audio controls>:
 *   - We need a rate selector in-line with the controls (per-message memory),
 *   - Native controls look different on every OS/browser,
 *   - We want the transcribe button right next to the bubble.
 */
export function AudioMessagePlayer({
  message,
  isOutbound,
  onTranscribed,
}: {
  message: Message;
  isOutbound: boolean;
  onTranscribed?: (t: TranscriptionResult) => void;
}) {
  const { ref: viewportRef, visible } = useVisible();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inbound WhatsApp audios arrive with no playable URL — the webhook only
  // carries an encrypted .enc CDN link. We hit the backend to resolve (and
  // cache) a decrypted URL on first play. Outbound audios already have
  // content.mediaUrl pointing to our own upload.
  const rawUrl = message.content?.mediaUrl as string | undefined;
  const initialMediaUrl = rawUrl && !/\.enc(\?|$)|mmg\.whatsapp\.net/i.test(rawUrl) ? rawUrl : undefined;
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(initialMediaUrl);
  const [resolving, setResolving] = useState(false);
  const mediaUrl = visible ? resolvedUrl : undefined;

  useEffect(() => {
    setResolvedUrl(initialMediaUrl);
  }, [initialMediaUrl, message.id]);

  const ensureResolved = async (): Promise<string | null> => {
    if (resolvedUrl) return resolvedUrl;
    setResolving(true);
    try {
      const { url } = await inboxService.resolveMediaUrl(message.id);
      setResolvedUrl(url);
      return url;
    } catch (err: unknown) {
      setError(inboxErrorMessage(err, 'Não foi possível carregar o áudio'));
      return null;
    } finally {
      setResolving(false);
    }
  };

  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptionResult | null>(
    message.metadata?.transcription ?? null,
  );
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Sync internal transcript with prop when socket pushes updated metadata.
  useEffect(() => {
    if (message.metadata?.transcription) {
      setTranscript(message.metadata.transcription);
    }
  }, [message.metadata?.transcription]);

  const colorBubble = isOutbound
    ? 'bg-[var(--bq-bubble-out)] text-[var(--bq-t1)] border border-[var(--bq-bubble-out-hair)]'
    : 'bg-[var(--bq-win-solid)] text-[var(--bq-t1)] shadow-sm  ';
  const colorAccent = isOutbound
    ? 'bg-[var(--bq-raised-2)]'
    : 'bg-[var(--bq-raised-2)] ';
  const colorAccentFilled = isOutbound
    ? 'bg-[var(--bq-win-solid)]'
    : 'bg-primary';
  const colorMuted = isOutbound
    ? 'text-[var(--bq-t1)]'
    : 'text-[var(--bq-t2)] ';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  const handleTogglePlay = async () => {
    setError(null);
    try {
      if (!resolvedUrl) {
        // Lazy-resolve on first play so we don't hit the provider on every
        // audio message in the list (e.g., loading a conversation with 50 audios).
        setLoading(true);
        const url = await ensureResolved();
        if (!url) return;
        // Audio element gets the src on next render — wait a tick before playing.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        setLoading(true);
        await audio.play();
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch (err: unknown) {
      setError(inboxErrorMessage(err, 'Erro ao reproduzir áudio'));
    } finally {
      setLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const pct = Number(e.target.value);
    audio.currentTime = (pct / 100) * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const progressPct = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const result = await inboxService.transcribeAudio(message.id);
      setTranscript(result);
      onTranscribed?.(result);
    } catch (err: unknown) {
      setTranscribeError(
        inboxErrorMessage(err, 'Erro ao transcrever'),
      );
    } finally {
      setTranscribing(false);
    }
  };

  // Only bail out if there's no way at all to resolve the media — i.e., the
  // message has neither a cached URL nor an external id the backend could use.
  // Otherwise we render the player and lazy-resolve on first play.
  if (!resolvedUrl && !message.externalId) {
    return (
      <div ref={viewportRef} className={`rounded-2xl px-4 py-2.5 ${colorBubble}`}>
        <p className={`text-sm italic ${isOutbound ? "text-[var(--bq-t1)]" : "opacity-70"}`}>🎵 Áudio indisponível</p>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className={`min-w-[240px] rounded-2xl px-3 py-2.5 ${colorBubble}`}>
      <audio
        ref={audioRef}
        src={mediaUrl}
        preload={visible ? "metadata" : "none"}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => setError('Falha ao carregar áudio')}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity ${
            isOutbound ? 'bg-[var(--bq-raised)] hover:bg-[var(--bq-raised-2)]' : 'bg-[var(--bq-raised)] hover:bg-[var(--bq-raised-2)]  '
          }`}
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
        >
          {loading || resolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className={`relative h-1 w-full rounded-full ${colorAccent}`}>
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-[width] ${colorAccentFilled}`}
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPct}
              onChange={handleSeek}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className={`flex items-center justify-between text-[10px] tabular-nums ${colorMuted}`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Popover className="relative shrink-0">
          <PopoverButton
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium outline-none transition-colors ${
              isOutbound
                ? 'bg-[var(--bq-raised)] hover:bg-[var(--bq-raised-2)] text-[var(--bq-t1)]'
                : 'bg-[var(--bq-raised)] hover:bg-[var(--bq-raised-2)] text-[var(--bq-t2)]   '
            }`}
            aria-label="Velocidade de reprodução"
          >
            {rate}×
            <ChevronDown className="h-2.5 w-2.5 opacity-70" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1 min-w-[80px] rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0  "
          >
            {({ close }) => <> {
              SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setRate(s); close(); }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-[12px] transition-colors ${
                    rate === s
                      ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                      : 'text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  '
                  }`}
                >
                  <span className="tabular-nums">{s}×</span>
                  {rate === s && <Check className="h-3 w-3" />}
                </button>
              ))
            } </>}
          </PopoverPanel>
        </Popover>
      </div>

      {error && (
        <p className={`mt-1.5 text-[11px] ${isOutbound ? 'text-[var(--bq-t1)]' : 'text-[var(--bq-err)]'}`}>
          {error}
        </p>
      )}

      {/* Transcription area */}
      <div className={`mt-2 flex items-center gap-2 border-t pt-2 ${
        isOutbound ? 'border-[var(--bq-hair)]' : 'border-[var(--bq-hair)] '
      }`}>
        {!transcript && !transcribing && (
          <button
            type="button"
            onClick={handleTranscribe}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              isOutbound
                ? 'text-[var(--bq-t1)] hover:bg-[var(--bq-raised)]'
                : 'text-[var(--bq-t2)] hover:bg-[var(--bq-raised)]  '
            }`}
          >
            <Sparkles className="h-3 w-3" />
            Transcrever
          </button>
        )}
        {transcribing && (
          <span className={`inline-flex items-center gap-1 text-[11px] ${colorMuted}`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcrevendo...
          </span>
        )}
        {transcribeError && (
          <span className="text-[11px] text-[var(--bq-err)]">{transcribeError}</span>
        )}
      </div>

      {transcript?.text && (
        <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
          isOutbound ? 'text-[var(--bq-t1)]' : 'text-[var(--bq-t2)] '
        }`}>
          {transcript.text}
        </p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
