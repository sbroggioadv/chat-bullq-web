'use client';

import { useMemo } from 'react';
import { sanitizeEmailHtml } from '../lib/email-sanitize';

interface EmailSafeBodyProps {
  body?: string | null;
  bodyHtml?: string | null;
  snippet?: string | null;
  className?: string;
}

/**
 * Renderiza corpo de e-mail com HTML sanitizado (DOMPurify).
 * Fallback para texto puro se não houver HTML.
 */
export function EmailSafeBody({
  body,
  bodyHtml,
  snippet,
  className = '',
}: EmailSafeBodyProps) {
  const safeHtml = useMemo(() => sanitizeEmailHtml(bodyHtml), [bodyHtml]);

  if (safeHtml) {
    return (
      <div
        className={`email-html-body break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-600 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:text-zinc-400 ${className}`}
        // HTML já passou por DOMPurify allowlist — nunca injete bodyHtml cru
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  const plain = (body || snippet || '(mensagem sem conteúdo)').trim();
  return (
    <div
      className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${className}`}
    >
      {plain}
    </div>
  );
}
