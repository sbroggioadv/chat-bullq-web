'use client';

/**
 * Sprint S18 Wave 3 — Fase 3 (OKLCH Color Picker)
 *
 * Componente standalone para edicao de cor em OKLCH com:
 *   - 3 sliders (L 0-100%, C 0-0.4, H 0-360)
 *   - input dual OKLCH <-> hex (sincronizado, com debounce visual via blur)
 *   - swatch preview 56x56 com label "AA ✓ / AA ✗" baseado em contraste
 *     contra `contrastAgainst` (default oklch(1 0 0) = branco puro)
 *   - acessivel: role=slider, aria-valuenow/min/max, aria-labels, keyboard nav
 *     nativa do <input type=range>
 *
 * Lib: `culori` (3KB gzip, OKLCH nativo + conversoes).
 *
 * Reusa `pickForeground` so pra picking de fg automatico — calculo de
 * contraste vive aqui (precisamos client-side pra preview instantaneo, o
 * server roda o mesmo calculo em `theme-contrast.util.ts` no api).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { converter, formatHex, parse } from 'culori';
import { HexColorPicker } from 'react-colorful';

interface OklchColorPickerProps {
  /** Label visivel (ex: "Cor primaria", "Cor accent"). */
  label: string;
  /** Cor atual em OKLCH literal `oklch(L C H)`. Componente e controlled. */
  value: string;
  /** Chamado quando o usuario muda a cor. Recebe string OKLCH literal. */
  onChange: (next: string) => void;
  /**
   * Cor de fundo contra a qual calcular WCAG. Default branco puro.
   * Passar `oklch(0.18 0.02 250)` quando previewing dark mode.
   */
  contrastAgainst?: string;
  /** Mode atual pra ajustar swatch background e contraste calculation. */
  mode?: 'light' | 'dark';
  /** Desabilita interacao (loading state). */
  disabled?: boolean;
  /** Ratio minimo WCAG (default 3.0 = AA pra UI). */
  minContrast?: number;
}

// ─── Helpers OKLCH parsing/formatting ──────────────────────────────

const OKLCH_REGEX = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(\s*\/\s*[\d.]+)?\s*\)$/;

interface OklchParts {
  l: number;
  c: number;
  h: number;
}

function parseOklchSafe(s: string): OklchParts | null {
  const m = s.match(OKLCH_REGEX);
  if (!m) return null;
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

function formatOklch({ l, c, h }: OklchParts): string {
  const lStr = l.toFixed(3).replace(/\.?0+$/, '');
  const cStr = c.toFixed(3).replace(/\.?0+$/, '');
  const hStr = Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/\.?0+$/, '');
  return `oklch(${lStr} ${cStr} ${hStr})`;
}

// ─── WCAG contrast (replicado client-side pra preview imediato) ─────

const toRgbLinear = converter('lrgb');

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function contrastRatio(a: string, b: string): number {
  try {
    const aLin = toRgbLinear(parse(a));
    const bLin = toRgbLinear(parse(b));
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

// ─── Hex <-> OKLCH conversion (lossy mas suficiente pra UI) ────────

const toOklchConverter = converter('oklch');

function hexToOklch(hex: string): OklchParts | null {
  try {
    const parsed = parse(hex);
    if (!parsed) return null;
    const ok = toOklchConverter(parsed);
    if (!ok || typeof ok.l !== 'number' || typeof ok.c !== 'number') return null;
    return {
      l: ok.l,
      c: ok.c,
      h: typeof ok.h === 'number' && !Number.isNaN(ok.h) ? ok.h : 0,
    };
  } catch {
    return null;
  }
}

function oklchToHex(parts: OklchParts): string {
  try {
    const hex = formatHex({ mode: 'oklch', l: parts.l, c: parts.c, h: parts.h });
    return hex ?? '#000000';
  } catch {
    return '#000000';
  }
}

// ─── Componente ─────────────────────────────────────────────────────

export function OklchColorPicker({
  label,
  value,
  onChange,
  contrastAgainst,
  mode = 'light',
  disabled = false,
  minContrast = 3.0,
}: OklchColorPickerProps) {
  const id = useId();
  const parsed = useMemo(() => parseOklchSafe(value), [value]);

  // Drafts pros 2 inputs textuais — sincronizamos com value quando blur.
  const [oklchDraft, setOklchDraft] = useState(value);
  const [hexDraft, setHexDraft] = useState(() => (parsed ? oklchToHex(parsed) : '#000000'));

  // Wave 4.2: popover do color wheel visual (react-colorful HexColorPicker).
  // Clicar no swatch abre; click fora ou Esc fecha.
  const [wheelOpen, setWheelOpen] = useState(false);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOklchDraft(value);
    if (parsed) setHexDraft(oklchToHex(parsed));
  }, [value, parsed]);

  // Click outside fecha o color wheel
  useEffect(() => {
    if (!wheelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        wheelContainerRef.current &&
        !wheelContainerRef.current.contains(e.target as Node)
      ) {
        setWheelOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setWheelOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [wheelOpen]);

  const commitParts = useCallback(
    (next: OklchParts) => {
      onChange(formatOklch(next));
    },
    [onChange],
  );

  const handleSlider = useCallback(
    (axis: 'l' | 'c' | 'h', raw: string) => {
      if (!parsed) return;
      const num = parseFloat(raw);
      if (Number.isNaN(num)) return;
      commitParts({ ...parsed, [axis]: num });
    },
    [parsed, commitParts],
  );

  const handleOklchBlur = useCallback(() => {
    const draft = parseOklchSafe(oklchDraft);
    if (draft) {
      commitParts(draft);
    } else {
      // Invalido — reverte ao value original
      setOklchDraft(value);
    }
  }, [oklchDraft, value, commitParts]);

  const handleHexBlur = useCallback(() => {
    const parts = hexToOklch(hexDraft.trim());
    if (parts) {
      commitParts(parts);
    } else {
      // Invalido — reverte
      if (parsed) setHexDraft(oklchToHex(parsed));
    }
  }, [hexDraft, parsed, commitParts]);

  // Wave 4.2: handler do color wheel visual. Recebe hex do react-colorful e
  // converte pra OKLCH antes de propagar. Atualizacao instantanea — sem blur.
  const handleWheelChange = useCallback(
    (nextHex: string) => {
      const parts = hexToOklch(nextHex);
      if (parts) {
        commitParts(parts);
      }
    },
    [commitParts],
  );

  // Contraste contra background fornecido (ou branco/quase-preto conforme mode)
  const defaultBg = mode === 'dark' ? 'oklch(0.18 0.02 250)' : 'oklch(1 0 0)';
  const bg = contrastAgainst ?? defaultBg;
  const ratio = useMemo(() => contrastRatio(value, bg), [value, bg]);
  const passesAA = ratio >= minContrast;

  const cssPreview = parsed ? formatOklch(parsed) : value;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header: label + swatch + WCAG badge */}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-oklch`} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {/* Wave 4.2: swatch agora e botao que abre color wheel visual.
              Click toggles popover; click outside ou Esc fecha. */}
          <div ref={wheelContainerRef} className="relative">
            <button
              type="button"
              onClick={() => !disabled && setWheelOpen((v) => !v)}
              disabled={disabled}
              aria-label={`Abrir seletor visual de cor para ${label}`}
              aria-expanded={wheelOpen}
              className="size-14 shrink-0 cursor-pointer rounded-md border border-zinc-200 shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:border-zinc-700 dark:focus:ring-offset-zinc-950"
              style={{ background: cssPreview }}
            />
            {wheelOpen && (
              <div
                role="dialog"
                aria-label={`Selecionar cor visualmente para ${label}`}
                className="absolute right-0 top-full z-50 mt-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                style={{ minWidth: 220 }}
              >
                <HexColorPicker
                  color={parsed ? oklchToHex(parsed) : '#000000'}
                  onChange={handleWheelChange}
                />
                <p className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                  Clique fora ou Esc pra fechar. Os sliders L/C/H abaixo ajustam fino.
                </p>
              </div>
            )}
          </div>
          <span
            role="status"
            aria-label={`Contraste WCAG: ${ratio.toFixed(2)} para 1, ${passesAA ? 'aprovado' : 'reprovado'}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              passesAA
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {passesAA ? `AA ✓ ${ratio.toFixed(1)}:1` : `AA ✗ ${ratio.toFixed(1)}:1`}
          </span>
        </div>
      </div>

      {/* Sliders L / C / H */}
      <div className="space-y-2">
        <SliderRow
          label="L"
          help="Lightness 0-100%"
          min={0}
          max={1}
          step={0.005}
          value={parsed?.l ?? 0.5}
          onChange={(v) => handleSlider('l', v)}
          disabled={disabled}
          format={(n) => `${(n * 100).toFixed(1)}%`}
        />
        <SliderRow
          label="C"
          help="Chroma 0-0.4"
          min={0}
          max={0.4}
          step={0.005}
          value={parsed?.c ?? 0.1}
          onChange={(v) => handleSlider('c', v)}
          disabled={disabled}
          format={(n) => n.toFixed(3)}
        />
        <SliderRow
          label="H"
          help="Hue 0-360"
          min={0}
          max={360}
          step={1}
          value={parsed?.h ?? 0}
          onChange={(v) => handleSlider('h', v)}
          disabled={disabled}
          format={(n) => `${Math.round(n)}°`}
        />
      </div>

      {/* Inputs textuais — OKLCH + hex */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-oklch`} className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            OKLCH
          </label>
          <input
            id={`${id}-oklch`}
            type="text"
            value={oklchDraft}
            onChange={(e) => setOklchDraft(e.target.value)}
            onBlur={handleOklchBlur}
            disabled={disabled}
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
          />
        </div>
        <div>
          <label htmlFor={`${id}-hex`} className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            HEX
          </label>
          <input
            id={`${id}-hex`}
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={handleHexBlur}
            disabled={disabled}
            spellCheck={false}
            placeholder="#000000"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs uppercase text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
          />
        </div>
      </div>

      {!parsed && (
        <p className="text-xs text-red-600 dark:text-red-400">
          OKLCH invalido — input precisa do formato <code className="font-mono">oklch(L C H)</code>
        </p>
      )}
    </div>
  );
}

// ─── Subcomponente: Slider row ──────────────────────────────────────

interface SliderRowProps {
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (raw: string) => void;
  disabled: boolean;
  format: (n: number) => string;
}

function SliderRow({ label, help, min, max, step, value, onChange, disabled, format }: SliderRowProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="w-4 shrink-0 text-center font-mono text-[10px] font-bold text-zinc-500 dark:text-zinc-400"
        title={help}
      >
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={help}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="flex-1 cursor-pointer accent-primary disabled:opacity-50"
      />
      <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
        {format(value)}
      </span>
    </div>
  );
}
