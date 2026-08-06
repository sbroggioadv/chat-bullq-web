'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  looksLikeCssDump,
  sanitizeEmailHtml,
} from '../lib/email-sanitize';

interface EmailSafeBodyProps {
  body?: string | null;
  bodyHtml?: string | null;
  snippet?: string | null;
  className?: string;
}

/**
 * Renderiza corpo de e-mail HTML em iframe sandbox (isola CSS/JS).
 * Imagens https passam; cid: ainda não (sem proxy Gmail).
 * Fallback plain se não houver HTML útil.
 */
export function EmailSafeBody({
  body,
  bodyHtml,
  snippet,
  className = '',
}: EmailSafeBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameH, setFrameH] = useState(240);

  const safeHtml = useMemo(
    () => sanitizeEmailHtml(bodyHtml, 'display'),
    [bodyHtml],
  );

  const docHtml = useMemo(() => {
    if (!safeHtml) return '';
    // documento mínimo: dark-friendly + img responsiva
    return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" rel="noopener noreferrer" />
<style>
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #18181b;
    word-break: break-word;
    background: transparent;
  }
  img { max-width: 100%; height: auto; }
  a { color: #2563eb; }
  table { max-width: 100%; border-collapse: collapse; }
</style></head><body>${safeHtml}</body></html>`;
  }, [safeHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !docHtml) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        const h = doc?.body?.scrollHeight || doc?.documentElement?.scrollHeight;
        if (h && h > 40) setFrameH(Math.min(Math.max(h + 16, 120), 1200));
      } catch {
        /* sandbox */
      }
    };

    const onLoad = () => {
      resize();
      // imagens carregam depois
      try {
        const imgs = iframe.contentDocument?.images;
        if (imgs) {
          Array.from(imgs).forEach((img) => {
            img.addEventListener('load', resize);
            img.addEventListener('error', resize);
          });
        }
      } catch {
        /* ignore */
      }
    };

    iframe.addEventListener('load', onLoad);
    // srcDoc set triggers load
    return () => iframe.removeEventListener('load', onLoad);
  }, [docHtml]);

  if (docHtml) {
    return (
      <div className={`w-full overflow-hidden rounded-md ${className}`}>
        <iframe
          ref={iframeRef}
          title="Conteúdo do e-mail"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          // allow-same-origin necessário p/ medir altura; sem allow-scripts = JS morto
          srcDoc={docHtml}
          className="w-full border-0 bg-transparent"
          style={{ height: frameH, minHeight: 120 }}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  let plain = (body || snippet || '(mensagem sem conteúdo)').trim();
  if (looksLikeCssDump(plain)) {
    plain =
      (snippet && !looksLikeCssDump(snippet) ? snippet : '') ||
      '(conteúdo HTML sem texto legível — abra no Gmail se precisar do layout completo)';
  }

  return (
    <div
      className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${className}`}
    >
      {plain}
    </div>
  );
}
