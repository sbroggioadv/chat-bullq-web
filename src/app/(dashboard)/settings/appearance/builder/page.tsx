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

import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, RotateCcw, Check, X, Save, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OklchColorPicker } from '@/features/theme/components/oklch-color-picker';
import { ThemePreviewMock } from '@/features/theme/components/theme-preview-mock';
import { useOrgBrand } from '@/features/theme/hooks/use-org-brand';
import { useThemePresets } from '@/features/theme/hooks/use-theme-presets';
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
 * Wave 4.1: defaults expandidos pra cada brand A/B/C. 14 cores × 2 modes
 * por brand (5 funcionais + 4 estrutura + 5 sidebar).
 *
 * Valores funcionais mantem workaround Wave 3 (dark primary L baixo pra
 * passar WCAG vs FG branco fixo). Valores estrutura/sidebar vem do
 * globals.css real (linhas 127-405) — eles sao validados literalmente
 * (fg vs bg fornecidos) e nao sofrem do tech debt.
 *
 * MANTER SINCRONIZADO com:
 *   - chat-bullq-api/src/modules/organizations/util/theme-defaults.util.ts (BRAND_PALETTE_DEFAULTS)
 *   - chat-bullq-web/src/app/globals.css (blocos html[data-brand="A|B|C"])
 *
 * Pra evitar drift quando algum dos 3 mudar.
 */
const BRAND_TOKEN_DEFAULTS: Record<OrgBrand, { light: ThemePalette; dark: ThemePalette; radius: string }> = {
  A: {
    light: {
      // Funcionais
      primary: 'oklch(0.22 0.04 250)',
      accent: 'oklch(0.45 0.18 35)',
      success: 'oklch(0.5 0.15 150)',
      warning: 'oklch(0.55 0.18 80)',
      danger: 'oklch(0.5 0.22 27)',
      // Estrutura
      bg: 'oklch(0.97 0.003 30)',
      surface: 'oklch(1 0 0)',
      fg: 'oklch(0.18 0.02 250)',
      border: 'oklch(0.9 0.008 30)',
      // Sidebar
      sidebar: 'oklch(0.985 0.003 30)',
      sidebarFg: 'oklch(0.18 0.02 250)',
      sidebarBorder: 'oklch(0.9 0.008 30)',
      sidebarAccent: 'oklch(0.94 0.04 35)',
      sidebarAccentFg: 'oklch(0.22 0.04 250)',
    },
    dark: {
      primary: 'oklch(0.4 0.08 250)',
      accent: 'oklch(0.5 0.16 35)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
      bg: 'oklch(0.16 0.012 250)',
      surface: 'oklch(0.22 0.015 250)',
      fg: 'oklch(0.97 0.003 30)',
      border: 'oklch(0.3 0.015 250)',
      sidebar: 'oklch(0.18 0.012 250)',
      sidebarFg: 'oklch(0.97 0.003 30)',
      sidebarBorder: 'oklch(0.3 0.015 250)',
      sidebarAccent: 'oklch(0.32 0.06 35)',
      sidebarAccentFg: 'oklch(0.97 0.003 30)',
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
      bg: 'oklch(0.99 0.003 240)',
      surface: 'oklch(1 0 0)',
      fg: 'oklch(0.18 0.01 240)',
      border: 'oklch(0.92 0.005 240)',
      sidebar: 'oklch(0.985 0.003 240)',
      sidebarFg: 'oklch(0.18 0.01 240)',
      sidebarBorder: 'oklch(0.92 0.005 240)',
      sidebarAccent: 'oklch(0.95 0.06 145)',
      sidebarAccentFg: 'oklch(0.32 0.18 145)',
    },
    dark: {
      primary: 'oklch(0.5 0.2 145)',
      accent: 'oklch(0.5 0.18 220)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
      bg: 'oklch(0.15 0.01 240)',
      surface: 'oklch(0.21 0.013 240)',
      fg: 'oklch(0.97 0.003 240)',
      border: 'oklch(0.3 0.012 240)',
      sidebar: 'oklch(0.17 0.01 240)',
      sidebarFg: 'oklch(0.97 0.003 240)',
      sidebarBorder: 'oklch(0.3 0.012 240)',
      sidebarAccent: 'oklch(0.28 0.05 145)',
      sidebarAccentFg: 'oklch(0.97 0.003 240)',
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
      bg: 'oklch(0.99 0 0)',
      surface: 'oklch(1 0 0)',
      fg: 'oklch(0.18 0 0)',
      border: 'oklch(0.92 0 0)',
      sidebar: 'oklch(0.99 0 0)',
      sidebarFg: 'oklch(0.18 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarAccent: 'oklch(0.96 0.04 22)',
      sidebarAccentFg: 'oklch(0.22 0 0)',
    },
    dark: {
      primary: 'oklch(0.3 0 0)',
      accent: 'oklch(0.5 0.2 22)',
      success: 'oklch(0.55 0.15 150)',
      warning: 'oklch(0.62 0.18 80)',
      danger: 'oklch(0.62 0.21 27)',
      bg: 'oklch(0.14 0 0)',
      surface: 'oklch(0.2 0 0)',
      fg: 'oklch(0.97 0 0)',
      border: 'oklch(0.28 0 0)',
      sidebar: 'oklch(0.16 0 0)',
      sidebarFg: 'oklch(0.97 0 0)',
      sidebarBorder: 'oklch(0.28 0 0)',
      sidebarAccent: 'oklch(0.3 0.08 22)',
      sidebarAccentFg: 'oklch(0.97 0 0)',
    },
    radius: '0.625rem',
  },
};

/**
 * Wave 4.1: mescla palette atual com defaults do brand pra garantir
 * que todos os 14 campos estao presentes. Necessario porque payloads
 * legacy (Wave 3/4) so trazem 5 cores funcionais — sem isso, pickers
 * dos campos novos abrem vazios.
 */
function mergeWithDefaults(
  current: ThemePalette,
  defaults: ThemePalette,
): ThemePalette {
  return {
    primary: current.primary ?? defaults.primary,
    accent: current.accent ?? defaults.accent,
    success: current.success ?? defaults.success,
    warning: current.warning ?? defaults.warning,
    danger: current.danger ?? defaults.danger,
    bg: current.bg ?? defaults.bg,
    surface: current.surface ?? defaults.surface,
    fg: current.fg ?? defaults.fg,
    border: current.border ?? defaults.border,
    sidebar: current.sidebar ?? defaults.sidebar,
    sidebarFg: current.sidebarFg ?? defaults.sidebarFg,
    sidebarBorder: current.sidebarBorder ?? defaults.sidebarBorder,
    sidebarAccent: current.sidebarAccent ?? defaults.sidebarAccent,
    sidebarAccentFg: current.sidebarAccentFg ?? defaults.sidebarAccentFg,
  };
}

function buildInitialDraft(base: OrgBrand, current: ThemeTokens | null): ThemeTokens {
  const defaults = BRAND_TOKEN_DEFAULTS[base];
  if (current) {
    // Wave 4.1: garante shape canonico de 14 cores mesmo se vier legacy
    return {
      ...current,
      light: mergeWithDefaults(current.light, defaults.light),
      dark: mergeWithDefaults(current.dark, defaults.dark),
    };
  }
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
    case 'SET_BASE': {
      // Trocar brand de origem RECARREGA todas as cores + radius do brand
      // novo. Sem isso o botao so atualiza a label visual e o usuario fica
      // confuso porque os pickers nao refletem o brand escolhido.
      // Densidade preserva escolha pessoal (nao e visual do brand).
      const defaults = BRAND_TOKEN_DEFAULTS[action.value];
      return {
        base: action.value,
        light: { ...defaults.light },
        dark: { ...defaults.dark },
        radius: defaults.radius,
        density: state.density,
      };
    }
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
    case 'IMPORT': {
      // Wave 4.1: payload importado pode ser legacy (5 cores). Mescla com
      // defaults do brand origem pra garantir 14 campos no draft.
      const base = action.tokens.base in BRAND_TOKEN_DEFAULTS ? action.tokens.base : 'A';
      const defaults = BRAND_TOKEN_DEFAULTS[base];
      return {
        ...action.tokens,
        base,
        light: mergeWithDefaults(action.tokens.light, defaults.light),
        dark: mergeWithDefaults(action.tokens.dark, defaults.dark),
      };
    }
    default:
      return state;
  }
}

// ─── Page ───────────────────────────────────────────────────────────

// Wave 4.1: 14 cores em 3 grupos collapsable. Grupo "Cores funcionais"
// abre por default (manter familiar pro user que ja conhecia Wave 3).
// Grupos novos (Estrutura, Sidebar) ficam fechados ate o user expandir.
interface ColorGroup {
  id: string;
  title: string;
  hint: string;
  defaultOpen: boolean;
  keys: Array<{ key: keyof ThemePalette; label: string }>;
}

const COLOR_GROUPS: ColorGroup[] = [
  {
    id: 'functional',
    title: 'Cores funcionais',
    hint: 'Botoes, badges, alertas — estados de acao',
    defaultOpen: true,
    keys: [
      { key: 'primary', label: 'Primaria' },
      { key: 'accent', label: 'Accent' },
      { key: 'success', label: 'Sucesso' },
      { key: 'warning', label: 'Aviso' },
      { key: 'danger', label: 'Perigo' },
    ],
  },
  {
    id: 'structure',
    title: 'Estrutura geral',
    hint: 'Fundo da pagina, cartoes, texto, bordas',
    defaultOpen: false,
    keys: [
      { key: 'bg', label: 'Fundo geral' },
      { key: 'surface', label: 'Superficie (cartoes)' },
      { key: 'fg', label: 'Texto' },
      { key: 'border', label: 'Bordas' },
    ],
  },
  {
    id: 'sidebar',
    title: 'Sidebar',
    hint: 'Barra lateral esquerda — fundo, texto, item ativo',
    defaultOpen: false,
    keys: [
      { key: 'sidebar', label: 'Sidebar (fundo)' },
      { key: 'sidebarFg', label: 'Sidebar (texto)' },
      { key: 'sidebarBorder', label: 'Sidebar (borda)' },
      { key: 'sidebarAccent', label: 'Sidebar (item ativo)' },
      { key: 'sidebarAccentFg', label: 'Sidebar (texto ativo)' },
    ],
  },
];

// Flat list pra iterar durante normalizacao (ex.: garantir todos os 14
// campos antes de salvar caso draft tenha undefined em algum).
const ALL_COLOR_KEYS = COLOR_GROUPS.flatMap((g) => g.keys.map((k) => k.key));

export default function ThemeBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-fg-muted">Carregando builder…</div>
      }
    >
      <ThemeBuilderInner />
    </Suspense>
  );
}

function ThemeBuilderInner() {
  const { brand, effectiveBrand, themeTokens, role } = useOrgBrand();
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  // ─── Wave 4: leitura de presetId via query param ───────────
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetIdParam = searchParams.get('presetId');

  const {
    presets,
    create,
    update,
    activate,
    isCreating,
    isUpdating: isUpdatingPreset,
    isActivating,
  } = useThemePresets();

  // Preset alvo (quando editando existente). Carregado pela query da lista.
  const editingPreset = presetIdParam
    ? presets.find((p) => p.id === presetIdParam)
    : null;
  const isEditMode = Boolean(presetIdParam);

  const initialBase =
    editingPreset?.tokens.base ?? themeTokens?.base ?? brand ?? effectiveBrand;
  const initialTokens = editingPreset?.tokens ?? themeTokens ?? null;

  const [draft, dispatch] = useReducer(draftReducer, undefined, () =>
    buildInitialDraft(initialBase, initialTokens),
  );

  // Quando o preset alvo carregar via react-query (timing assíncrono),
  // sincroniza o draft uma vez. Se Doc já editou, mantém — só hidrata
  // quando draft ainda está em estado inicial "do brand" (não-modificado).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editingPreset || hydratedRef.current) return;
    dispatch({ type: 'IMPORT', tokens: editingPreset.tokens });
    setPresetName(editingPreset.name);
    hydratedRef.current = true;
  }, [editingPreset]);

  // Nome do preset (Wave 4): vazio em modo novo, do preset em modo editar.
  const [presetName, setPresetName] = useState<string>(
    editingPreset?.name ?? '',
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

  // ─── Wave 4: 3 ações de salvar ─────────────────────────
  // Substitui o antigo "Aplicar pra toda a banca" (single slot).
  //
  // - Salvar como novo: cria preset (POST), não ativa
  // - Salvar mudanças: atualiza preset existente (PATCH) — só em modo editar
  // - Salvar e ativar: cria/atualiza + ativa em sequência

  function effectiveName(): string {
    return presetName.trim() || 'Sem nome';
  }

  const warnIfBadContrast = useCallback(() => {
    if (!allPass) {
      toast.warning('Tema tem cores ilegíveis', {
        description: `${failingChecks.length} par(es) falhando AA — pode ser rejeitado pelo servidor`,
      });
    }
  }, [allPass, failingChecks.length]);

  const handleSaveAsNew = useCallback(
    async (alsoActivate = false) => {
      if (!canEdit) return;
      const name = effectiveName();
      if (!presetName.trim()) {
        toast.info('Nome auto-aplicado', { description: `Salvo como "${name}"` });
      }
      warnIfBadContrast();
      try {
        const created = await create({ name, tokens: draft });
        if (alsoActivate) {
          await activate(created.id);
        }
        // Redireciona pro builder em modo editar (sem perder o draft visual)
        router.replace(`/settings/appearance/builder?presetId=${created.id}`);
      } catch {
        // hook já lida com toast de erro
      }
    },
    [canEdit, presetName, draft, create, activate, warnIfBadContrast, router],
  );

  const handleSaveChanges = useCallback(
    async (alsoActivate = false) => {
      if (!canEdit || !editingPreset) return;
      warnIfBadContrast();
      try {
        const newName = presetName.trim();
        const payload: { name?: string; tokens?: ThemeTokens } = { tokens: draft };
        if (newName && newName !== editingPreset.name) {
          payload.name = newName;
        }
        await update(editingPreset.id, payload);
        if (alsoActivate && !editingPreset.isActive) {
          await activate(editingPreset.id);
        }
      } catch {
        // hook trata
      }
    },
    [canEdit, editingPreset, presetName, draft, update, activate, warnIfBadContrast],
  );

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

  // Wave 4: handleClearCustom removido. Remoção agora vive no menu do card
  // em /settings/appearance ("Deletar"), não mais como ação global do builder.

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href="/settings/appearance"
              className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {isEditMode ? 'Editar tema' : 'Novo tema'}
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Customize cores OKLCH + radius + densidade. Preview live ao lado, validação WCAG no rodapé.
          </p>

          {/* ─── Wave 4: input de nome do preset ─── */}
          <div className="mt-3 flex max-w-md items-center gap-2">
            <label className="sr-only" htmlFor="preset-name">
              Nome do tema
            </label>
            <input
              id="preset-name"
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={80}
              placeholder={isEditMode ? '' : 'Nome do tema (ex: Black Friday 2026)'}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {editingPreset?.isActive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Check className="size-3" /> Ativo
              </span>
            )}
          </div>
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
                  onClick={() => {
                    if (draft.base === b) return;
                    const ok = window.confirm(
                      `Trocar pra "${BRAND_META[b].name}" vai recarregar todas as cores e radius desse brand, perdendo customizacoes nao salvas. Continuar?`,
                    );
                    if (ok) dispatch({ type: 'SET_BASE', value: b });
                  }}
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
            <p className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
              Carrega as cores deste brand como ponto de partida. Voce edita por cima.
            </p>
          </div>

          {/* Wave 4.1: 14 pickers em 3 grupos collapsable */}
          <div className="space-y-2">
            {COLOR_GROUPS.map((group) => (
              <ColorGroupAccordion
                key={group.id}
                group={group}
                draft={draft}
                activeMode={activeMode}
                onChange={(key, next) =>
                  dispatch({ type: 'SET_COLOR', mode: activeMode, key, value: next })
                }
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
        </div>

        {/* ─── Wave 4: 3 ações de salvar ─── */}
        <div className="flex flex-wrap items-center gap-2">
          {isEditMode && (
            <button
              type="button"
              onClick={() => handleSaveChanges(false)}
              disabled={isUpdatingPreset || isActivating}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              title="Atualiza este preset sem ativar"
            >
              <Save className="size-3.5" />
              {isUpdatingPreset ? 'Salvando…' : 'Salvar mudanças'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveAsNew(false)}
            disabled={isCreating || isActivating}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="Cria novo preset com este nome e tokens"
          >
            <Save className="size-3.5" />
            {isCreating ? 'Criando…' : 'Salvar como novo'}
          </button>

          <button
            type="button"
            onClick={() =>
              isEditMode ? handleSaveChanges(true) : handleSaveAsNew(true)
            }
            disabled={isCreating || isUpdatingPreset || isActivating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Salva e aplica imediatamente em toda a banca"
          >
            <PlayCircle className="size-4" />
            {isActivating ? 'Ativando…' : 'Salvar e ativar'}
          </button>
        </div>
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

/**
 * Wave 4.1: accordion com header clicavel + body de pickers. Estado local
 * (open/closed) inicia conforme `group.defaultOpen` mas user pode togglar.
 *
 * Usa <details>/<summary> nativo? Optei por div+button por dois motivos:
 *   1. controle fino da animacao/transition do icone chevron
 *   2. evita que <summary> default leaks styling (ex.: marker triangle)
 * Mas eh acessivel mesmo assim — button tem role implicito + aria-expanded.
 */
function ColorGroupAccordion({
  group,
  draft,
  activeMode,
  onChange,
}: {
  group: ColorGroup;
  draft: ThemeTokens;
  activeMode: 'light' | 'dark';
  onChange: (key: keyof ThemePalette, value: string) => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`group-body-${group.id}`}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {group.title}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            {group.hint}
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-zinc-500" aria-hidden />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-zinc-500" aria-hidden />
        )}
      </button>
      {open && (
        <div
          id={`group-body-${group.id}`}
          className="space-y-2 border-t border-zinc-200 p-2 dark:border-zinc-800"
        >
          {group.keys.map(({ key, label }) => (
            <OklchColorPicker
              key={`${activeMode}-${key}`}
              label={`${label} (${activeMode})`}
              value={draft[activeMode][key] ?? ''}
              onChange={(next) => onChange(key, next)}
              mode={activeMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
