import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Decisão do Doc em 06/11/2026: no dark, as superfícies e bordas da camada de marca são
// cinzas neutros (croma 0) e o --bg é o mesmo preto de --bq-wall-a. O jsdom não aplica o
// CSS importado, então a regra é conferida no próprio globals.css.
const SURFACE_TOKENS = [
  '--bg',
  '--bg-elev',
  '--surface',
  '--surface-2',
  '--border',
  '--border-strong',
  '--secondary',
  '--muted',
  '--card',
  '--popover',
  '--sidebar',
  '--sidebar-border',
] as const;

// Na marca B, --secondary é o verde da marca (par de --secondary-fg verde), não superfície.
const NEUTRAL_BY_BRAND: Record<'A' | 'B' | 'C', readonly string[]> = {
  A: SURFACE_TOKENS,
  B: SURFACE_TOKENS.filter(token => token !== '--secondary'),
  C: SURFACE_TOKENS,
};

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;

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

// Caminho a partir da raiz: o Vite reescreve new URL('./x.css', import.meta.url) como asset.
const css = readFileSync('src/app/globals.css', 'utf8');

describe.each(['A', 'B', 'C'] as const)('camada de marca %s no dark', brand => {
  const selector = `html[data-brand="${brand}"][data-mode="dark"]`;
  const block = declarationsOf(css, selector);

  it('existe no globals.css', () => {
    expect(block.size, `bloco ${selector} ausente em globals.css`).toBeGreaterThan(0);
  });

  it.each(NEUTRAL_BY_BRAND[brand])('%s é oklch com croma 0', token => {
    const value = block.get(token);
    expect(value, `${token} ausente em ${selector}`).toBeDefined();
    const parsed = OKLCH.exec(value ?? '');
    expect(parsed, `${token} em ${selector} não é oklch(L C H): ${value}`).not.toBeNull();
    expect(Number(parsed?.[2]), `${token} em ${selector} tem croma: ${value}`).toBe(0);
  });

  it('--bg é o preto de --bq-wall-a', () => {
    expect(block.get('--bg')).toBe('oklch(0 0 0)');
  });
});
