/**
 * Sprint S18 Wave 3 Fase 4 — WCAG contrast client-side
 *
 * Espelha a logica de `src/modules/organizations/util/theme-contrast.util.ts`
 * do API (NestJS) pra rodar preview imediato no Builder. Usa culori pra
 * conversao OKLCH -> linear sRGB. Server tem o calculo puro-math (sem dep)
 * e ele e a fonte de verdade pra rejeitar 422 — esta versao client e so
 * preview.
 *
 * Por que duplicar?
 *   - Server: roda em validation pipe antes de salvar. Sem dep externa
 *     (oklchToLinearRgb manual). Latencia 0, sem rede.
 *   - Client: roda em cada slider move pra atualizar badge AA/AA. Usa
 *     culori que ja esta no bundle (color picker depende). Sem rede.
 *
 * Os dois precisam dar exatamente o mesmo numero — checks adicionais no
 * Builder vao consumir esta util e mostrar feedback antes do save.
 */

import { converter, parse } from 'culori';

export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_UI = 3.0;

const toLrgb = converter('lrgb');

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

export function contrastRatio(a: string, b: string): number {
  try {
    const aLin = toLrgb(parse(a));
    const bLin = toLrgb(parse(b));
    if (!aLin || !bLin) return 1;
    const la = relativeLuminance(aLin as { r: number; g: number; b: number });
    const lb = relativeLuminance(bLin as { r: number; g: number; b: number });
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 1;
  }
}

export interface ContrastCheck {
  name: string;
  description: string;
  ratio: number;
  passes: boolean;
  required: number;
}

/**
 * Mesmos 6 pares que o server valida. Retorna lista detalhada
 * (cada check com nome + ratio + passes + threshold). Builder usa
 * pra mostrar checklist verde/vermelho no footer.
 */
export function previewContrastChecks(tokens: {
  light: { primary: string; accent: string; danger: string };
  dark: { primary: string; accent: string; danger: string };
}): ContrastCheck[] {
  const FG_ON_DARK = 'oklch(0.985 0 0)';
  const SURFACE_LIGHT = 'oklch(1 0 0)';
  const SURFACE_DARK = 'oklch(0.18 0.01 250)';

  const pairs: Array<{ name: string; description: string; fg: string; bg: string }> = [
    {
      name: 'Botao primario (claro)',
      description: 'texto branco sobre primary light',
      fg: FG_ON_DARK,
      bg: tokens.light.primary,
    },
    {
      name: 'Botao accent (claro)',
      description: 'texto branco sobre accent light',
      fg: FG_ON_DARK,
      bg: tokens.light.accent,
    },
    {
      name: 'Badge erro (claro)',
      description: 'danger sobre superficie clara',
      fg: tokens.light.danger,
      bg: SURFACE_LIGHT,
    },
    {
      name: 'Botao primario (escuro)',
      description: 'texto branco sobre primary dark',
      fg: FG_ON_DARK,
      bg: tokens.dark.primary,
    },
    {
      name: 'Botao accent (escuro)',
      description: 'texto branco sobre accent dark',
      fg: FG_ON_DARK,
      bg: tokens.dark.accent,
    },
    {
      name: 'Badge erro (escuro)',
      description: 'danger sobre superficie escura',
      fg: tokens.dark.danger,
      bg: SURFACE_DARK,
    },
  ];

  return pairs.map(({ name, description, fg, bg }) => {
    const ratio = contrastRatio(fg, bg);
    return {
      name,
      description,
      ratio,
      passes: ratio >= WCAG_AA_UI,
      required: WCAG_AA_UI,
    };
  });
}
