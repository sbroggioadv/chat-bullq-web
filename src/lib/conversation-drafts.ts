const PREFIX = 'bullq:draft:v1:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function warn() { console.warn('Não foi possível acessar os rascunhos.'); }
function key(orgId: string, conversationId: string) { return `${PREFIX}${orgId}:${conversationId}`; }
function authenticated(orgId: string | null) {
  return !!orgId && typeof window !== 'undefined' && !!localStorage.getItem('access_token');
}

export function readConversationDraft(orgId: string | null, conversationId: string): string {
  try {
    if (!authenticated(orgId)) return '';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const name = localStorage.key(i);
      if (!name?.startsWith(PREFIX)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(name) || 'null');
        if (!value || typeof value.text !== 'string' || typeof value.savedAt !== 'number' || Date.now() - value.savedAt >= MAX_AGE) localStorage.removeItem(name);
      } catch { localStorage.removeItem(name); }
    }
    const value = JSON.parse(localStorage.getItem(key(orgId!, conversationId)) || 'null');
    return value?.text ?? '';
  } catch { warn(); return ''; }
}

export function writeConversationDraft(orgId: string | null, conversationId: string, text: string) {
  try {
    if (!authenticated(orgId)) return;
    const name = key(orgId!, conversationId);
    if (text === '') localStorage.removeItem(name);
    else localStorage.setItem(name, JSON.stringify({ text, savedAt: Date.now() }));
  } catch { warn(); }
}

export function clearConversationDrafts() {
  try {
    if (typeof window === 'undefined') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const name = localStorage.key(i);
      if (name?.startsWith(PREFIX)) localStorage.removeItem(name);
    }
  } catch { warn(); }
}
