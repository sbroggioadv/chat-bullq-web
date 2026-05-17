/**
 * Sprint S18 Wave 3 — Theme Builder OKLCH PRO (Fase 2 frontend)
 *
 * Gera tokens derivados (hover, soft, fg, e radius proporcional) a partir
 * das cores base custom do Doc. Sem dep externa — manipulacao direta da
 * string OKLCH `oklch(L C H)`.
 *
 * Principios:
 *   - hover: desloca L em +- 6% (light fica mais escuro no hover, dark fica
 *     mais claro). Mantem C e H.
 *   - soft: L vai pra ~94% (light) ou ~24% (dark), C reduz pra ~20% do
 *     original. Pra fundos de "badge soft".
 *   - fg: escolhe quase-branco se a cor base e escura (L abaixo de 0.6),
 *     quase-preto se clara. Decisao automatica preserva legibilidade.
 *   - radius proporcional: sm = base * 0.5, md = base * 0.75, lg = base,
 *     xl = base * 1.5.
 */

const OKLCH_REGEX = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(\s*\/\s*[\d.]+)?\s*\)$/;

interface ParsedOklch {
  l: number;
  c: number;
  h: number;
}

function parseOklch(s: string): ParsedOklch {
  const m = s.match(OKLCH_REGEX);
  if (!m) throw new Error(`Invalid OKLCH: "${s}"`);
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

function formatOklch({ l, c, h }: ParsedOklch): string {
  // 3 casas pra l (variacao fina), 3 pra c, sem decimal pra h se inteiro
  const lStr = l.toFixed(3).replace(/\.?0+$/, '');
  const cStr = c.toFixed(3).replace(/\.?0+$/, '');
  const hStr = Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/\.?0+$/, '');
  return `oklch(${lStr} ${cStr} ${hStr})`;
}

/** Quase-branco padrao pra texto em fundo escuro. */
const FG_LIGHT = 'oklch(0.985 0 0)';
/** Quase-preto padrao pra texto em fundo claro (com tinge azul-graphite). */
const FG_DARK = 'oklch(0.18 0.02 250)';

/**
 * Texto contrastante automatico: se a cor base e escura (L abaixo 0.6),
 * usa texto quase-branco. Se clara, texto quase-preto. Regra simples mas
 * resolve 99% dos casos de botao/badge.
 */
export function pickForeground(baseOklch: string): string {
  try {
    const { l } = parseOklch(baseOklch);
    return l < 0.6 ? FG_LIGHT : FG_DARK;
  } catch {
    return FG_LIGHT;
  }
}

/**
 * Hover: desloca lightness em 6% na direcao que faz sentido.
 * - Cores escuras (L abaixo 0.5): clareiam no hover (+6%)
 * - Cores claras (L acima 0.5): escurecem (-6%)
 *
 * Mantem chroma e hue. Clamp em 0..1.
 */
export function deriveHover(baseOklch: string): string {
  const p = parseOklch(baseOklch);
  const delta = p.l < 0.5 ? 0.06 : -0.06;
  const next = Math.max(0, Math.min(1, p.l + delta));
  return formatOklch({ ...p, l: next });
}

/**
 * Soft: variante muito clara/escura da cor pra fundos discretos (badges,
 * alerts soft). No light mode, vai pra L=0.94 com C reduzido. No dark,
 * vai pra L=0.24.
 */
export function deriveSoft(baseOklch: string, mode: 'light' | 'dark'): string {
  const p = parseOklch(baseOklch);
  const targetL = mode === 'light' ? 0.94 : 0.24;
  const targetC = p.c * 0.2;
  return formatOklch({ l: targetL, c: targetC, h: p.h });
}

/**
 * Radius proporcional a partir do `--radius-lg` base custom.
 * Defaults seguem proporcoes do design system atual:
 *   sm = base * 0.5, md = base * 0.75, lg = base, xl = base * 1.5
 */
export function deriveRadius(baseRem: string): {
  sm: string;
  md: string;
  lg: string;
  xl: string;
} {
  const match = baseRem.match(/^([\d.]+)rem$/);
  const base = match ? parseFloat(match[1]) : 0.5;
  return {
    sm: `${(base * 0.5).toFixed(3).replace(/\.?0+$/, '')}rem`,
    md: `${(base * 0.75).toFixed(3).replace(/\.?0+$/, '')}rem`,
    lg: `${base}rem`,
    xl: `${(base * 1.5).toFixed(3).replace(/\.?0+$/, '')}rem`,
  };
}

/**
 * Density tokens: 3 presets que afetam padding vertical de listas/linhas/tabs.
 * Valores derivados da regra ±25% sobre o default `comfortable`:
 *   - py-list  (linhas de conversation-list, sidebar nav): default 0.625rem (py-2.5)
 *     compact = 0.5rem (py-2), spacious = 0.875rem (~py-3.5)
 *   - py-row   (tabs de settings, table rows): default 0.75rem (py-3)
 *     compact = 0.5rem (py-2), spacious = 1rem (py-4)
 *
 * Quando density === 'comfortable' (ou undefined), nao injetamos override:
 * o globals.css ja tras os defaults. So mudamos quando o usuario customizou.
 */
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';

const DENSITY_TOKENS: Record<ThemeDensity, { pyList: string; pyRow: string }> = {
  compact: { pyList: '0.5rem', pyRow: '0.5rem' },
  comfortable: { pyList: '0.625rem', pyRow: '0.75rem' },
  spacious: { pyList: '0.875rem', pyRow: '1rem' },
};

export function buildDensityBlock(density: ThemeDensity | undefined): string {
  if (!density || density === 'comfortable') return '';
  const tokens = DENSITY_TOKENS[density];
  return `--density-py-list: ${tokens.pyList}; --density-py-row: ${tokens.pyRow};`;
}

/**
 * Wave 4.1: helper pra shift de L (clamp 0..1). Usado pra derivar
 * tokens como bg-elev, surface-2, fg-muted, fg-subtle, border-strong.
 */
function shiftLightness(oklchStr: string, delta: number): string {
  try {
    const p = parseOklch(oklchStr);
    const next = Math.max(0, Math.min(1, p.l + delta));
    return formatOklch({ ...p, l: next });
  } catch {
    return oklchStr;
  }
}

/**
 * Constroi o bloco de CSS vars completo a partir da palette completa
 * (Wave 4.1: 14 cores) + radius + density + mode.
 *
 * Tokens emitidos:
 *  - Funcionais (Wave 3): primary, primary-hover, primary-fg, accent,
 *    accent-hover, accent-soft, accent-fg, success, success-fg,
 *    warning, warning-fg, danger, danger-fg.
 *  - Estrutura (Wave 4.1): bg, bg-elev (derivado), surface, surface-2
 *    (derivado), fg, fg-muted (derivado), fg-subtle (derivado), border,
 *    border-strong (derivado).
 *  - Aliases (Wave 4.1): card+card-fg (= surface+fg), popover+popover-fg
 *    (= surface+fg), muted (= bg-elev), muted-fg (= fg-muted), secondary
 *    (= bg-elev), secondary-fg (= fg).
 *  - Sidebar (Wave 4.1): sidebar, sidebar-fg, sidebar-border, sidebar-accent,
 *    sidebar-accent-fg.
 *  - Radius: radius-sm, radius-md, radius-lg, radius-xl.
 *  - Density (so quando != 'comfortable'): density-py-list, density-py-row.
 *
 * Wave 3 -> 4.1: ANTES o util so emitia funcionais (bg/fg/surface herdavam do
 * brand base). AGORA emite tudo — Doc customiza sidebar verde fluo e a
 * sidebar fica verde fluo de verdade.
 *
 * Backward-compat: se palette.bg etc. vier undefined, pula a emissao desse
 * token (o brand base no globals.css continua valendo).
 */
export interface ExpandedPalette {
  // Funcionais (Wave 3)
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  // Estrutura (Wave 4.1)
  bg?: string;
  surface?: string;
  fg?: string;
  border?: string;
  // Sidebar (Wave 4.1)
  sidebar?: string;
  sidebarFg?: string;
  sidebarBorder?: string;
  sidebarAccent?: string;
  sidebarAccentFg?: string;
}

export function buildThemeOverrideCss(opts: {
  light: ExpandedPalette;
  dark: ExpandedPalette;
  radius: string;
  density?: ThemeDensity;
}): { light: string; dark: string } {
  const radius = deriveRadius(opts.radius);
  const radiusBlock = `--radius-sm: ${radius.sm}; --radius-md: ${radius.md}; --radius-lg: ${radius.lg}; --radius-xl: ${radius.xl};`;
  const densityBlock = buildDensityBlock(opts.density);

  const buildColorBlock = (palette: ExpandedPalette, mode: 'light' | 'dark'): string => {
    const out: string[] = [];

    // ─── Funcionais + derivados (Wave 3) ────────────────
    const pFg = pickForeground(palette.primary);
    const aFg = pickForeground(palette.accent);
    const sFg = pickForeground(palette.success);
    const wFg = pickForeground(palette.warning);
    const dFg = pickForeground(palette.danger);
    out.push(
      `--primary: ${palette.primary};`,
      `--primary-hover: ${deriveHover(palette.primary)};`,
      `--primary-fg: ${pFg};`,
      `--accent: ${palette.accent};`,
      `--accent-hover: ${deriveHover(palette.accent)};`,
      `--accent-soft: ${deriveSoft(palette.accent, mode)};`,
      `--accent-fg: ${aFg};`,
      `--success: ${palette.success};`,
      `--success-fg: ${sFg};`,
      `--warning: ${palette.warning};`,
      `--warning-fg: ${wFg};`,
      `--danger: ${palette.danger};`,
      `--danger-fg: ${dFg};`,
    );

    // ─── Estrutura (Wave 4.1) + derivados ───────────────
    // Derivacoes preservam direcao do mode:
    //   light: bg-elev mais claro, fg-muted mais claro (low contrast), border-strong mais escuro
    //   dark:  bg-elev mais claro, fg-muted mais escuro (low contrast), border-strong mais claro
    if (palette.bg) {
      const bgElev = shiftLightness(palette.bg, 0.015);
      out.push(`--bg: ${palette.bg};`, `--bg-elev: ${bgElev};`);
    }
    if (palette.surface) {
      const surface2 = shiftLightness(
        palette.surface,
        mode === 'light' ? -0.015 : 0.015,
      );
      out.push(`--surface: ${palette.surface};`, `--surface-2: ${surface2};`);
    }
    if (palette.fg) {
      // fg-muted: 27% menos contraste; fg-subtle: 42% menos contraste
      const direction = mode === 'light' ? 1 : -1; // light: fg escuro, muted vai pra cinza
      const fgMuted = shiftLightness(palette.fg, direction * 0.27);
      const fgSubtle = shiftLightness(palette.fg, direction * 0.42);
      out.push(
        `--fg: ${palette.fg};`,
        `--fg-muted: ${fgMuted};`,
        `--fg-subtle: ${fgSubtle};`,
      );
    }
    if (palette.border) {
      // border-strong: light vai pra mais escuro, dark vai pra mais claro
      const borderStrong = shiftLightness(
        palette.border,
        mode === 'light' ? -0.08 : 0.08,
      );
      out.push(
        `--border: ${palette.border};`,
        `--border-strong: ${borderStrong};`,
      );
    }

    // ─── Aliases shadcn-like (Wave 4.1) ─────────────────
    // Componentes shadcn consomem --card, --popover, --muted, --secondary.
    // Mapeamos a partir dos tokens canonicos pra estes ficarem coerentes
    // com o tema custom (em vez de herdar do brand base).
    if (palette.surface && palette.fg) {
      out.push(
        `--card: ${palette.surface};`,
        `--card-fg: ${palette.fg};`,
        `--popover: ${palette.surface};`,
        `--popover-fg: ${palette.fg};`,
      );
    }
    if (palette.bg && palette.fg) {
      // muted (= bg-elev derivado) e muted-fg (= fg-muted derivado)
      const bgElev = shiftLightness(palette.bg, 0.015);
      const direction = mode === 'light' ? 1 : -1;
      const fgMuted = shiftLightness(palette.fg, direction * 0.27);
      out.push(`--muted: ${bgElev};`, `--muted-fg: ${fgMuted};`);
      // secondary (= bg-elev) e secondary-fg (= fg)
      out.push(`--secondary: ${bgElev};`, `--secondary-fg: ${palette.fg};`);
    }

    // ─── Sidebar (Wave 4.1) ─────────────────────────────
    if (palette.sidebar) out.push(`--sidebar: ${palette.sidebar};`);
    if (palette.sidebarFg) out.push(`--sidebar-fg: ${palette.sidebarFg};`);
    if (palette.sidebarBorder)
      out.push(`--sidebar-border: ${palette.sidebarBorder};`);
    if (palette.sidebarAccent)
      out.push(`--sidebar-accent: ${palette.sidebarAccent};`);
    if (palette.sidebarAccentFg)
      out.push(`--sidebar-accent-fg: ${palette.sidebarAccentFg};`);

    return out.join(' ');
  };

  // Density e independente de mode (afeta layout, nao cor), entao adicionamos
  // o mesmo bloco nos dois selectors. Se vazio (comfortable), nao adiciona.
  const tail = densityBlock ? ` ${densityBlock}` : '';

  return {
    light: `${buildColorBlock(opts.light, 'light')} ${radiusBlock}${tail}`,
    dark: `${buildColorBlock(opts.dark, 'dark')} ${radiusBlock}${tail}`,
  };
}
