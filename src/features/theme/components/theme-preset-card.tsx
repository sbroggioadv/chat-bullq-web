/**
 * Sprint S18 Wave 4 — Theme Presets Library (Fase 3 UI)
 *
 * Card de preset na lista de "Meus temas customizados". Mostra:
 * - swatch das 5 cores (light palette)
 * - nome
 * - badge "Ativo" se isActive
 * - menu dropdown com Ativar / Editar / Duplicar / Deletar
 *
 * Lógica fica no parent (useThemePresets) — este componente só renderiza
 * e dispara callbacks.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Check, MoreVertical, Pencil, Copy, Trash2, Play } from 'lucide-react';
import type { ThemePreset } from '../services/theme-presets.service';

interface Props {
  preset: ThemePreset;
  isPending?: boolean;
  onActivate: (presetId: string) => void;
  onDuplicate: (preset: ThemePreset) => void;
  onDelete: (preset: ThemePreset) => void;
}

export function ThemePresetCard({
  preset,
  isPending,
  onActivate,
  onDuplicate,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const swatches = [
    preset.tokens.light.primary,
    preset.tokens.light.accent,
    preset.tokens.light.success,
    preset.tokens.light.warning,
    preset.tokens.light.danger,
  ];

  return (
    <article
      className={`group relative rounded-xl border bg-surface p-4 transition-all ${
        preset.isActive
          ? 'border-primary shadow-sm ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:shadow-sm'
      }`}
    >
      {/* Header com nome + badge + menu */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg" title={preset.name}>
            {preset.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-fg-subtle">
            Base {preset.tokens.base} · radius {preset.tokens.radius}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {preset.isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="size-3" /> Ativo
            </span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
              aria-label="Ações do preset"
              disabled={isPending}
            >
              <MoreVertical className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                {!preset.isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onActivate(preset.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-fg hover:bg-muted"
                  >
                    <Play className="size-3.5" /> Ativar
                  </button>
                )}
                <Link
                  href={`/settings/appearance/builder?presetId=${preset.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-fg hover:bg-muted"
                >
                  <Pencil className="size-3.5" /> Editar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(preset);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-fg hover:bg-muted"
                >
                  <Copy className="size-3.5" /> Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(preset);
                  }}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-3.5" /> Deletar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Swatches */}
      <div className="mt-3 flex gap-1.5">
        {swatches.map((color, i) => (
          <div
            key={i}
            className="size-7 flex-1 rounded-md border border-border shadow-inner"
            style={{ backgroundColor: color }}
            title={color}
            aria-hidden
          />
        ))}
      </div>
    </article>
  );
}
