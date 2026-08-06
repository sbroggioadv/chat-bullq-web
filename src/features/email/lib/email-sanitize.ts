import DOMPurify from 'dompurify';

/** Compose: formatação simples do editor. */
const COMPOSE_TAGS = [
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

/** Display: newsletters (tabelas + imagens https). */
const DISPLAY_TAGS = [
  ...COMPOSE_TAGS,
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'img',
  'center',
  'font',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'figure',
  'figcaption',
  'sup',
  'sub',
  'small',
];

const COMPOSE_ATTR = ['href', 'target', 'rel'];

const DISPLAY_ATTR = [
  ...COMPOSE_ATTR,
  'src',
  'alt',
  'width',
  'height',
  'align',
  'valign',
  'bgcolor',
  'border',
  'cellpadding',
  'cellspacing',
  'colspan',
  'rowspan',
  'role',
  'style',
  'color',
  'face',
  'size',
];

export type SanitizeMode = 'compose' | 'display';

/**
 * Sanitiza HTML de e-mail no browser antes de qualquer render.
 * Nunca passe HTML cru sem passar por aqui.
 */
export function sanitizeEmailHtml(
  html: string | null | undefined,
  mode: SanitizeMode = 'compose',
): string {
  if (typeof window === 'undefined') return '';
  const raw = String(html || '').trim();
  if (!raw) return '';

  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: mode === 'display' ? DISPLAY_TAGS : COMPOSE_TAGS,
    ALLOWED_ATTR: mode === 'display' ? DISPLAY_ATTR : COMPOSE_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    // cid: vira data:image/* no server — precisa liberar data URI só em <img>
    ADD_DATA_URI_TAGS: mode === 'display' ? ['img'] : [],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  return String(clean);
}

/** HTML do editor → texto plain (para body fallback da API). */
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') {
    return String(html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  const safe = sanitizeEmailHtml(html, 'compose');
  const div = document.createElement('div');
  div.innerHTML = safe;
  return (div.innerText || div.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Detecta dump de CSS no plain (UI fallback). */
export function looksLikeCssDump(s: string | null | undefined): boolean {
  const t = String(s || '');
  if (t.length < 20) return false;
  return (
    /#outlook\b|\.ExternalClass\b|@media\s+only|mso-|\{\s*padding\s*:|\/\*|-ms-text-size-adjust/i.test(
      t,
    ) && /[{};]/.test(t)
  );
}
