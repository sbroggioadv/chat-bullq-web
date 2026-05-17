'use client';

/**
 * Sprint S18 Wave 3 Fase 4 — Theme Builder page
 *
 * Layout 50/50 split:
 *   - <aside> controles (5 OklchColorPickers + radius slider + density)
 *   - <main> preview live (ThemePreviewMock)
 *
 * Estado:
 *   - useReducer mantem `draft` local; mutacoes via dispatch sao instantaneas
 *   - Preview repinta automatico (props ThemeTokens fluem direto)
 *   - "Aplicar" persiste via PATCH /organizations (rejeita 422 se WCAG falhar)
 *   - "Reset" volta tokens do brand `base` atual (A/B/C)
 *   - "Export JSON" baixa .json
 *   - "Importar JSON" file picker + isThemeTokens type guard
 *
 * Validacao WCAG inline no rodape (footer) usando `previewContrastChecks`.
 * Server roda mesmo calculo e rejeita 422 se algum par falhar — UI mostra
 * antes pra evitar trip pro server.
 */

import { useCallback, useReducer, useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, RotateCcw, Check, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { OklchColorPicker } from '@/features/theme/components/oklch-color-picker';
import { ThemePreviewMock } from '@/features/theme/components/theme-preview-mock';
import { useOrgBrand } from '@/features/theme/hooks/use-org-brand';
import {
  BRAND_META,
  isThemeTokens,
  type OrgBrand,
  type ThemeTokens,
  type ThemeDensity,
  type ThemePalette,
} from '@/features/theme/types/brand';
import { previewContrastChecks } from '@/features/theme/util/contrast.util';

// ─── Defaults por brand base ────────────────────────────────────────

/**
 * Defaults completos pra cada brand A/B/C. Os 5 valores aqui sao os
 * usados como ponto de partida quando Doc clica "Reset" ou abre o
 * builder pela primeira vez. Vem do globals.css mas duplicados aqui
 * pra ter como JS pure (sem precisar parse de CSS em runtime).
 *
 * NOTA TECH DEBT (Sprint S19): o server-side `theme-contrast.util.ts`
 * (Fase 1) valida contraste assumindo `primary-fg = FG_ON_DARK` (branco
 * fixo). Mas o app real usa `pickForeground()` (L < 0.6 → branco, else
 * → quase-preto) — entao primary claro no dark mode tem fg PRETO.
 * Resultado: server rejeita 422 defaults validos do globals.css real.
 * Workaround temporario: dark primary aqui usa L=0.4 (suficientemente
 * escuro pra texto branco passar AA), mesmo que globals.css use L=0.7.
 * Fix correto fica pra Sprint S19: server deve usar pickForeground
 * dinamico em vez de FG_ON_DARK fixo.
 */
const BRAND_TOKEN_DEFAULTS: Record<OrgBrand, { light: ThemePalette; dark: ThemePalette; radius: string }> = {
  A: {
    light: {
      primary: 'oklch(0.22 0.04 250)',
      accent: 'oklch(0.45 0.18 35)',
      success: 'oklch(0.5 0.15 150)',
      warning: 'oklch(0.55 0.18 80)',
      danger: 'oklch(0.5 0.22 27)',
    },
    dark: {
      primary: 'oklch(0.4 0.08 250)',
      accent: 'oklch(0.5 0.16 35)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
    },
    radius: '0.5rem',
  },
  B: {
    light: {
      primary: 'oklch(0.45 0.2 145)',
      accent: 'oklch(0.45 0.18 220)',
      success: 'oklch(0.5 0.15 150)',
      warning: 'oklch(0.55 0.18 80)',
      danger: 'oklch(0.5 0.22 27)',
    },
    dark: {
      primary: 'oklch(0.5 0.2 145)',
      accent: 'oklch(0.5 0.18 220)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
    },
    radius: '0.375rem',
  },
  C: {
    light: {
      primary: 'oklch(0.22 0 0)',
      accent: 'oklch(0.5 0.2 22)',
      success: 'oklch(0.5 0.15 150)',
      warning: 'oklch(0.55 0.18 80)',
      danger: 'oklch(0.5 0.22 27)',
    },
    dark: {
      primary: 'oklch(0.3 0 0)',
      accent: 'oklch(0.5 0.2 22)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
    },
    radius: '0.625rem',
  },
};

function buildInitialDraft(base: OrgBrand, current: ThemeTokens | null): ThemeTokens {
  if (current) return current;
  const defaults = BRAND_TOKEN_DEFAULTS[base];
  return {
    base,
    light: { ...defaults.light },
    dark: { ...defaults.dark },
    radius: defaults.radius,
    density: 'comfortable',
  };
}

// ─── Reducer ────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'SET_COLOR'; mode: 'light' | 'dark'; key: keyof ThemePalette; value: string }
  | { type: 'SET_RADIUS'; value: string }
  | { type: 'SET_DENSITY'; value: ThemeDensity }
  | { type: 'SET_BASE'; value: OrgBrand }
  | { type: 'RESET'; base: OrgBrand }
  | { type: 'IMPORT'; tokens: ThemeTokens };

function draftReducer(state: ThemeTokens, action: DraftAction): ThemeTokens {
  switch (action.type) {
    case 'SET_COLOR':
      return {
        ...state,
        [action.mode]: { ...state[action.mode], [action.key]: action.value },
      };
    case 'SET_RADIUS':
      return { ...state, radius: action.value };
    case 'SET_DENSITY':
      return { ...state, density: action.value };
    case 'SET_BASE':
      return { ...state, base: action.value };
    case 'RESET': {
      const defaults = BRAND_TOKEN_DEFAULTS[action.base];
      return {
        base: action.base,
        light: { ...defaults.light },
        dark: { ...defaults.dark },
        radius: defaults.radius,
        density: 'comfortable',
      };
    }
    case 'IMPORT':
      return action.tokens;
    default:
      return state;
  }
}

// ─── Page ───────────────────────────────────────────────────────────

const COLOR_KEYS: Array<{ key: keyof ThemePalette; label: string }> = [
  { key: 'primary', label: 'Primaria' },
  { key: 'accent', label: 'Accent' },
  { key: 'success', label: 'Sucesso' },
  { key: 'warning', label: 'Aviso' },
  { key: 'danger', label: 'Perigo' },
];

export default function ThemeBuilderPage() {
  const { brand, effectiveBrand, themeTokens, setThemeTokens, isUpdatingTokens, role } = useOrgBrand();
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const initialBase = themeTokens?.base ?? brand ?? effectiveBrand;
  const [draft, dispatch] = useReducer(draftReducer, undefined, () =>
    buildInitialDraft(initialBase, themeTokens),
  );
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WCAG checks ao vivo
  const checks = previewContrastChecks({
    light: { primary: draft.light.primary, accent: draft.light.accent, danger: draft.light.danger },
    dark: { primary: draft.dark.primary, accent: draft.dark.accent, danger: draft.dark.danger },
  });
  const failingChecks = checks.filter((c) => !c.passes);
  const allPass = failingChecks.length === 0;

  const handleApply = useCallback(async () => {
    if (!canEdit) return;
    if (!allPass) {
      toast.warning('Tema tem cores ilegiveis', {
        description: `${failingChecks.length} par(es) falhando AA — pode ser rejeitado pelo servidor`,
      });
    }
    try {
      await setThemeTokens(draft);
    } catch {
      // Toast ja vem do hook (use-org-brand) em onError
    }
  }, [canEdit, allPass, failingChecks.length, setThemeTokens, draft]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET', base: draft.base });
    toast.info(`Resetado para ${BRAND_META[draft.base].name}`);
  }, [draft.base]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `theme-${draft.base}-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Tema exportado');
  }, [draft]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset pra permitir re-pick do mesmo arquivo
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isThemeTokens(parsed)) {
        toast.error('JSON invalido', { description: 'Estrutura nao bate com ThemeTokens' });
        return;
      }
      dispatch({ type: 'IMPORT', tokens: parsed });
      toast.success('Tema importado');
    } catch (err) {
      toast.error('Erro ao ler arquivo', {
        description: err instanceof Error ? err.message : 'JSON malformado',
      });
    }
  }, []);

  const handleClearCustom = useCallback(async () => {
    if (!canEdit) return;
    try {
      await setThemeTokens(null);
      toast.success('Tema custom removido');
    } catch {
      // hook trata
    }
  }, [canEdit, setThemeTokens]);

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-900/10">
        <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
          Acesso restrito
        </h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Apenas OWNER ou ADMIN da organizacao podem customizar a aparencia.
        </p>
        <Link
          href="/settings/appearance"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-900 underline dark:text-amber-200"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/appearance"
              className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Theme Builder</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Customize cores OKLCH + radius + densidade. Preview live ao lado, validacao WCAG no rodape.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          <ModeTab active={activeMode === 'light'} onClick={() => setActiveMode('light')}>
            Light
          </ModeTab>
          <ModeTab active={activeMode === 'dark'} onClick={() => setActiveMode('dark')}>
            Dark
          </ModeTab>
        </div>
      </div>

      {/* Body 50/50 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aside controles */}
        <aside className="space-y-3">
          {/* Brand base picker */}
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Brand de origem
            </label>
            <div className="mt-2 flex gap-1.5">
              {(['A', 'B', 'C'] as OrgBrand[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_BASE', value: b })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    draft.base === b
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {BRAND_META[b].name}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers do mode ativo */}
          <div className="space-y-2">
            {COLOR_KEYS.map(({ key, label }) => (
              <OklchColorPicker
                key={`${activeMode}-${key}`}
                label={`${label} (${activeMode})`}
                value={draft[activeMode][key]}
                onChange={(next) =>
                  dispatch({ type: 'SET_COLOR', mode: activeMode, key, value: next })
                }
                mode={activeMode}
              />
            ))}
          </div>

          {/* Radius + density */}
          <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <label
                htmlFor="radius-slider"
                className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Radius base ({draft.radius})
              </label>
              <input
                id="radius-slider"
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={parseFloat(draft.radius)}
                onChange={(e) => dispatch({ type: 'SET_RADIUS', value: `${e.target.value}rem` })}
                className="mt-2 w-full cursor-pointer accent-primary"
                aria-valuemin={0}
                aria-valuemax={1.5}
                aria-valuenow={parseFloat(draft.radius)}
              />
            </div>
            <div>
              <label
                htmlFor="density-select"
                className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Densidade
              </label>
              <select
                id="density-select"
                value={draft.density ?? 'comfortable'}
                onChange={(e) =>
                  dispatch({ type: 'SET_DENSITY', value: e.target.value as ThemeDensity })
                }
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="compact">Compact (-25%)</option>
                <option value="comfortable">Comfortable (default)</option>
                <option value="spacious">Spacious (+25%)</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Preview */}
        <main className="lg:sticky lg:top-6 lg:self-start">
          <ThemePreviewMock
            light={draft.light}
            dark={draft.dark}
            radius={draft.radius}
            density={draft.density}
            mode={activeMode}
          />

          {/* WCAG checks */}
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {allPass ? (
                <>
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  WCAG AA: tudo aprovado
                </>
              ) : (
                <>
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <X className="size-3" strokeWidth={3} />
                  </span>
                  WCAG AA: {failingChecks.length} par(es) falhando
                </>
              )}
            </h3>
            <ul className="mt-2 space-y-1">
              {checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-xs">
                  <span className={c.passes ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-700 dark:text-red-400 font-medium'}>
                    {c.passes ? '✓' : '✗'} {c.name}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    {c.ratio.toFixed(2)}:1 / min {c.required}:1
                  </span>
                </li>
              ))}
            </ul>
            {!allPass && (
              <p className="mt-2 text-[11px] text-red-700 dark:text-red-400">
                Pares vermelhos: server vai rejeitar com HTTP 422 ao aplicar. Ajuste lightness ou chroma pra subir o contraste.
              </p>
            )}
          </div>
        </main>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download className="size-3.5" /> Export JSON
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Upload className="size-3.5" /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          {themeTokens !== null && (
            <button
              type="button"
              onClick={handleClearCustom}
              disabled={isUpdatingTokens}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/10"
            >
              Remover custom
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={isUpdatingTokens}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdatingTokens ? 'Aplicando…' : 'Aplicar pra toda a banca'}
        </button>
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}
