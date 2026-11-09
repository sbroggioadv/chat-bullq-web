import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// O jsdom não aplica o CSS importado; a cor do chip ativo é conferida no próprio arquivo.
const ACTIVE_CHIP = '.bq-list-chips .bq-button[aria-pressed="true"]';

function declarationsOf(css: string, selector: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = new Map<string, string>();
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map(part => part.trim().replace(/\s+/g, ' '));
    if (!selectors.includes(selector)) continue;
    for (const declaration of match[2].split(';')) {
      const colon = declaration.indexOf(':');
      if (colon === -1) continue;
      declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
    }
  }
  return declarations;
}

it('pinta o chip ativo da lista com os tokens da variante sólida', () => {
  // Caminho a partir da raiz: o Vite reescreve new URL('./x.css', import.meta.url) como asset.
  const css = readFileSync('src/features/inbox/components/conversations.css', 'utf8');
  const rule = declarationsOf(css, ACTIVE_CHIP);

  expect(rule.size, `regra ${ACTIVE_CHIP} ausente em conversations.css`).toBeGreaterThan(0);
  expect(rule.get('background')).toBe('var(--bq-solid-bg)');
  expect(rule.get('color')).toBe('var(--bq-solid-fg)');
});
