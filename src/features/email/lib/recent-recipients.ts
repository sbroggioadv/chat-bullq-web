/**
 * Histórico local de destinatários digitados no Encaminhar / compose.
 * Salva no browser do usuário (localStorage) — sem backend.
 */

const STORAGE_KEY = 'bullq.email.recentRecipients.v1';
const MAX = 40;

function normalizeEmail(raw: string): string | null {
  const m = String(raw || '')
    .trim()
    .toLowerCase()
    .match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0].toLowerCase() : null;
}

export function parseEmails(raw: string): string[] {
  return String(raw || '')
    .split(/[,;]+/)
    .map((s) => normalizeEmail(s))
    .filter((e): e is string => !!e);
}

export function loadRecentRecipients(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => normalizeEmail(String(x)))
      .filter((e): e is string => !!e)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

/** Salva um ou vários e-mails no topo do histórico. */
export function rememberRecipients(raw: string | string[]): string[] {
  if (typeof window === 'undefined') return [];
  const incoming = Array.isArray(raw) ? raw.flatMap(parseEmails) : parseEmails(raw);
  if (!incoming.length) return loadRecentRecipients();
  const prev = loadRecentRecipients();
  const seen = new Set<string>();
  const next: string[] = [];
  for (const e of [...incoming, ...prev]) {
    if (seen.has(e)) continue;
    seen.add(e);
    next.push(e);
    if (next.length >= MAX) break;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — ignora
  }
  return next;
}

/** Filtra histórico por prefixo digitado (último token após vírgula). */
export function suggestRecipients(input: string, limit = 8): string[] {
  const all = loadRecentRecipients();
  const parts = String(input || '').split(/[,;]/);
  const last = (parts[parts.length - 1] || '').trim().toLowerCase();
  if (!last) return all.slice(0, limit);
  return all.filter((e) => e.includes(last) && e !== last).slice(0, limit);
}
