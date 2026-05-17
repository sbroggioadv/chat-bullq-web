/**
 * Theme System — bullq2 web · Sprint S17
 *
 * Brand é o nível org (todos os membros veem o mesmo). Mode é o nível
 * user/device (preferência pessoal, persistida via next-themes em
 * `localStorage[bullq2-theme-mode]`).
 */

export type OrgBrand = 'A' | 'B' | 'C';

export const ORG_BRANDS: readonly OrgBrand[] = ['A', 'B', 'C'] as const;

/**
 * Default visual quando a org ainda não escolheu brand (brand === null).
 * Brand A = Sbroggio Graphite, identidade institucional sóbria.
 */
export const DEFAULT_BRAND: OrgBrand = 'A';

export interface BrandMeta {
  id: OrgBrand;
  name: string;
  tagline: string;
  description: string;
  vibe: string;
  /** Cor primária em OKLCH no modo light — pra previews/swatches sem CSS scoped. */
  swatchPrimary: string;
  /** Cor accent em OKLCH no modo light — pra previews/swatches sem CSS scoped. */
  swatchAccent: string;
  /** Background em OKLCH no modo light — fundo do card de preview. */
  swatchBg: string;
}

export const BRAND_META: Record<OrgBrand, BrandMeta> = {
  A: {
    id: 'A',
    name: 'Sbroggio Graphite',
    tagline: 'Institucional',
    description:
      'Navy graphite + terracota. Sério, OAB-compliant, identidade de banca empresarial.',
    vibe: 'Confiança e autoridade',
    swatchPrimary: 'oklch(0.22 0.04 250)',
    swatchAccent: 'oklch(0.62 0.16 35)',
    swatchBg: 'oklch(0.97 0.003 30)',
  },
  B: {
    id: 'B',
    name: 'Plain Tech',
    tagline: 'Moderno',
    description:
      'Verde elétrico + cyan. Geométrico, energético, foco em produto-tech. Recomendado pra contas com pegada SaaS.',
    vibe: 'Velocidade e produto',
    swatchPrimary: 'oklch(0.55 0.22 145)',
    swatchAccent: 'oklch(0.58 0.2 220)',
    swatchBg: 'oklch(0.99 0.003 240)',
  },
  C: {
    id: 'C',
    name: 'Stripe Paper',
    tagline: 'Minimal',
    description:
      'Charcoal puro + rose vivid. Papel premium, contraste alto, 1 accent vibrante. Stripe-like.',
    vibe: 'Sofisticação e foco',
    swatchPrimary: 'oklch(0.22 0 0)',
    swatchAccent: 'oklch(0.64 0.22 22)',
    swatchBg: 'oklch(0.99 0 0)',
  },
};

export function isOrgBrand(value: unknown): value is OrgBrand {
  return value === 'A' || value === 'B' || value === 'C';
}

// ─── Sprint S18 Wave 3 — Theme Builder OKLCH PRO ──────────────────

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';

/**
 * Palette de cores customizadas. Cores em OKLCH literal `oklch(L C H)`.
 * Hover, soft, fg, etc. são DERIVADOS no client a partir destas 5 cores
 * (ver `derived-tokens.util.ts`) — não são persistidos pra evitar drift.
 */
export interface ThemePalette {
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

/**
 * Tokens customizados da banca. Sobrescreve o brand A/B/C selecionado.
 * NULL no `Organization` = sem custom (usa brand). Não-null = override.
 * Validação WCAG AA roda server-side em `validateThemeContrast()`.
 */
export interface ThemeTokens {
  /** Brand de origem — referência pra Reset e derivações default. */
  base: OrgBrand;
  light: ThemePalette;
  dark: ThemePalette;
  /** Radius base em rem (`0.5rem`). sm/md/lg/xl são proporcionais. */
  radius: string;
  /** Densidade visual (afeta spacing). Default: comfortable. */
  density?: ThemeDensity;
}

export function isThemePalette(v: unknown): v is ThemePalette {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.primary === 'string' &&
    typeof p.accent === 'string' &&
    typeof p.success === 'string' &&
    typeof p.warning === 'string' &&
    typeof p.danger === 'string'
  );
}

export function isThemeTokens(v: unknown): v is ThemeTokens {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (
    isOrgBrand(t.base) &&
    isThemePalette(t.light) &&
    isThemePalette(t.dark) &&
    typeof t.radius === 'string'
  );
}
