import DOMPurify from 'dompurify';

/** Tags de formatação de e-mail (espelha allowlist do servidor). */
const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Sanitiza HTML de e-mail no browser antes de qualquer render.
 * Nunca passe HTML cru em dangerouslySetInnerHTML.
 */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (typeof window === 'undefined') {
    // SSR: não renderiza HTML cru — caller deve preferir plain
    return '';
  }
  const raw = String(html || '').trim();
  if (!raw) return '';
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

/** HTML do editor → texto plain (para body fallback da API). */
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') {
    return String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  const safe = sanitizeEmailHtml(html);
  const div = document.createElement('div');
  div.innerHTML = safe;
  return (div.innerText || div.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
