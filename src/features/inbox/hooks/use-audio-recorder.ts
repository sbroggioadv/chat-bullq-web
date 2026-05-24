'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type RecordingState = 'idle' | 'recording' | 'stopped';

/**
 * Wraps the browser's MediaRecorder API with React-friendly state.
 * The hook owns the MediaStream lifecycle — it releases the microphone on
 * unmount or when the recording finishes, so the tab's mic indicator doesn't
 * stay lit after the user sends the message.
 *
 * Critical ordering (MDN, observed in Safari): stop the MediaRecorder FIRST,
 * wait for `onstop` to fire (which means all chunks are finalised and the
 * blob is sealed), THEN release the MediaStream tracks. Releasing tracks
 * before the recorder finishes draining can invalidate the final chunk and
 * produce an empty blob — that's exactly what was happening in production.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/webm');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickMime = (): string => {
    if (typeof window === 'undefined') return 'audio/webm';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) {
        return m;
      }
    }
    return 'audio/webm';
  };

  /** Stop tick interval + release mic. Called from onstop callback (NEVER from stop()). */
  const releaseStream = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => releaseStream, [releaseStream]);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    setElapsedMs(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chosenMime = pickMime();
      setMimeType(chosenMime);
      const recorder = new MediaRecorder(stream, { mimeType: chosenMime });
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const out = new Blob(chunksRef.current, { type: chosenMime });
        // Release mic AFTER recorder is fully drained — this is the whole
        // reason we don't kill tracks inside stop().
        releaseStream();
        if (out.size === 0) {
          setError('Nenhum áudio capturado. Tente novamente.');
          setState('idle');
          return;
        }
        setBlob(out);
        setState('stopped');
      };

      startedAtRef.current = Date.now();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);

      recorder.start(250); // chunk every 250ms
      setState('recording');
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permissão de microfone negada'
          : err?.message || 'Erro ao acessar microfone';
      setError(msg);
      setState('idle');
      releaseStream();
    }
  }, [releaseStream]);

  /**
   * Stop the recorder. DOES NOT release mic — that happens inside `onstop`
   * after the final chunk is drained and the blob sealed.
   */
  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      // Recorder not active — release immediately (defensive).
      releaseStream();
      setState('idle');
    }
  }, [releaseStream]);

  /** Abandon recording without producing a blob. */
  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec) {
      // Swap the onstop handler so we don't transition to 'stopped' state
      // with a half-baked blob the user explicitly discarded.
      rec.onstop = () => {
        releaseStream();
      };
      if (rec.state !== 'inactive') {
        rec.stop();
      } else {
        releaseStream();
      }
    } else {
      releaseStream();
    }
    setBlob(null);
    setState('idle');
    setElapsedMs(0);
    chunksRef.current = [];
  }, [releaseStream]);

  /** Reset after a successful send. */
  const reset = useCallback(() => {
    setBlob(null);
    setState('idle');
    setElapsedMs(0);
    chunksRef.current = [];
  }, []);

  return { state, elapsedMs, error, blob, mimeType, start, stop, cancel, reset };
}
