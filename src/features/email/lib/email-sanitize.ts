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

/** Pré-strip: DOMPurify com KEEP_CONTENT default deixa CSS de <style> como texto. */
function stripStyleAndHead(html: string): string {
  let s = String(html || '');
  s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, ' ');
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ');
    s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ');
    if (s === before) break;
  }
  s = s.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  // CSS nu comum em newsletters (fora de <style>)
  for (let i = 0; i < 10; i++) {
    const before = s;
    s = s.replace(
      /(^|>)(\s*)(?:#outlook|\.ExternalClass|@media\s+only|@font-face|#MessageViewBody|u\s*\+\s*[\w.#]|body\s*,\s*table|a\[x-apple-data-detectors\]|div\[style\*=)[\s\S]{10,20000}?\}(?=\s*(?:<|$))/gi,
      '$1$2',
    );
    s = s.replace(
      /(^|>)(\s*)([^<]{40,}(?:!important|text-size-adjust|mso-table|ExternalClass)[^<]{10,})(?=<|$)/gi,
      (full, boundary: string, sp: string, chunk: string) =>
        isCssNoiseText(chunk) ? `${boundary}${sp}` : full,
    );
    if (s === before) break;
  }
  return s;
}

function isCssNoiseText(s: string): boolean {
  const t = String(s || '').trim();
  if (t.length < 8) return false;
  if (looksLikeCssDump(t)) return true;
  const semis = (t.match(/;/g) || []).length;
  const braces = (t.match(/[{}]/g) || []).length;
  const importants = (t.match(/!important/gi) || []).length;
  const letters = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length || 1;
  const punct = (t.match(/[{}:;#@!]/g) || []).length;
  if (importants >= 2 && semis >= 2) return true;
  if (braces >= 2 && semis >= 3) return true;
  if (t.length >= 40 && punct >= 12 && punct / letters > 0.12 && semis >= 3) {
    return true;
  }
  if (/u\s*\+\s*[\w.#]/.test(t) && /[{};]/.test(t)) return true;
  if (
    /(?:text-size-adjust|mso-table|ExternalClass|#outlook|interpolation-mode)/i.test(
      t,
    ) &&
    /[{};]/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Remove nós de texto que ainda são CSS (pós-DOMPurify). */
function stripCssTextNodes(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__email_root">${html}</div>`,
      'text/html',
    );
    const root = doc.getElementById('__email_root');
    if (!root) return html;

    const walk = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) {
          if (isCssNoiseText(child.textContent || '')) {
            child.parentNode?.removeChild(child);
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(root);

    // remove wrappers vazios
    root.querySelectorAll('div,span,p,font,center').forEach((el) => {
      if (!(el.textContent || '').trim() && !el.querySelector('img,table,br,a')) {
        el.remove();
      }
    });

    return root.innerHTML;
  } catch {
    // fallback string
    return String(html || '')
      .replace(/^([^<]+)/, (chunk) => (isCssNoiseText(chunk) ? '' : chunk))
      .replace(/>([^<]+)</g, (full, chunk: string) =>
        isCssNoiseText(chunk) ? '><' : full,
      );
  }
}

/**
 * Sanitiza HTML de e-mail no browser antes de qualquer render.
 * Nunca passe HTML cru sem passar por aqui.
 */
export function sanitizeEmailHtml(
  html: string | null | undefined,
  mode: SanitizeMode = 'compose',
): string {
  if (typeof window === 'undefined') return '';
  const raw = stripStyleAndHead(String(html || '')).trim();
  if (!raw) return '';

  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: mode === 'display' ? DISPLAY_TAGS : COMPOSE_TAGS,
    ALLOWED_ATTR: mode === 'display' ? DISPLAY_ATTR : COMPOSE_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    // remove conteúdo de tags proibidas (evita CSS virar texto)
    FORBID_TAGS: ['style', 'script', 'head', 'link', 'meta', 'base', 'title'],
    FORBID_CONTENTS: ['style', 'script', 'head', 'title', 'noscript'],
    // cid: vira data:image/* no server — precisa liberar data URI só em <img>
    ADD_DATA_URI_TAGS: mode === 'display' ? ['img'] : [],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  return stripCssTextNodes(String(clean));
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
  if (t.length < 8) return false;
  return (
    /#outlook\b|\.ExternalClass\b|@media\s+only|@font-face\b|mso-|\{\s*padding\s*:|\/\*|-ms-text-size-adjust|-webkit-text-size-adjust|u\s*\+\s*[\w.#]|a\s+img\s*\{|#MessageViewBody|a\[x-apple-data-detectors\]|-ms-interpolation-mode|mso-table-lspace/i.test(
      t,
    ) && /[{};]/.test(t)
  );
}
