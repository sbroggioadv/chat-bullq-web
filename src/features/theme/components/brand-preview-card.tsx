'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_META, type OrgBrand } from '../types/brand';

interface BrandPreviewCardProps {
  brand: OrgBrand;
  selected: boolean;
  onSelect: (brand: OrgBrand) => void;
  disabled?: boolean;
  /** Renderiza com tamanho reduzido (settings inline). */
  size?: 'lg' | 'md';
}

/**
 * Card de preview de um brand. Usa custom property `--swatch-bg` pra
 * mostrar o aspecto visual do tema sem precisar trocar o `data-brand`
 * do `<html>` — preview é estático e local, escolha do user só
 * persiste com `onSelect`.
 */
export function BrandPreviewCard({
  brand,
  selected,
  onSelect,
  disabled,
  size = 'lg',
}: BrandPreviewCardProps) {
  const meta = BRAND_META[brand];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Escolher ${meta.name}`}
      disabled={disabled}
      onClick={() => onSelect(brand)}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary shadow-lg'
          : 'border-border hover:border-border-strong hover:shadow-md',
        disabled && 'cursor-not-allowed opacity-60',
        size === 'lg' ? 'min-h-[280px]' : 'min-h-[220px]',
      )}
    >
      {/* Header com tagline e badge selected */}
      <div
        className="flex items-start justify-between px-5 pt-5 pb-3"
        style={{ backgroundColor: meta.swatchBg }}
      >
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: meta.swatchPrimary, opacity: 0.65 }}
          >
            Tema {meta.id} · {meta.tagline}
          </p>
          <h3 className="mt-1 text-lg font-bold" style={{ color: meta.swatchPrimary }}>
            {meta.name}
          </h3>
        </div>
        {selected && (
          <span
            className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Preview mock — UI miniatura */}
      <div
        className="flex flex-1 flex-col gap-2 px-5 pb-3"
        style={{ backgroundColor: meta.swatchBg }}
      >
        {/* Mock de conversation card */}
        <div
          className="flex items-center gap-3 rounded-lg border bg-white p-3"
          style={{ borderColor: 'oklch(0.92 0.005 240)' }}
        >
          <div
            className="size-8 shrink-0 rounded-full"
            style={{ backgroundColor: meta.swatchPrimary }}
          />
          <div className="flex-1">
            <div
              className="h-2 w-24 rounded-full"
              style={{ backgroundColor: meta.swatchPrimary, opacity: 0.8 }}
            />
            <div
              className="mt-1.5 h-1.5 w-32 rounded-full"
              style={{ backgroundColor: meta.swatchPrimary, opacity: 0.3 }}
            />
          </div>
          <span
            className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: meta.swatchAccent }}
          >
            2
          </span>
        </div>

        {/* Mock de botão CTA */}
        <div className="flex items-center gap-2">
          <div
            className="h-7 flex-1 rounded-md text-xs"
            style={{ backgroundColor: meta.swatchPrimary }}
          />
          <div
            className="h-7 w-16 rounded-md"
            style={{ backgroundColor: meta.swatchAccent, opacity: 0.15 }}
          />
        </div>

        {/* Swatches */}
        <div className="mt-1 flex gap-1.5">
          <span
            className="size-5 rounded-full border border-black/5"
            style={{ backgroundColor: meta.swatchPrimary }}
            title="Primary"
          />
          <span
            className="size-5 rounded-full border border-black/5"
            style={{ backgroundColor: meta.swatchAccent }}
            title="Accent"
          />
          <span
            className="size-5 rounded-full border border-black/5"
            style={{ backgroundColor: meta.swatchBg }}
            title="Background"
          />
        </div>
      </div>

      {/* Descrição embaixo, fora do swatch BG (usa cores semânticas) */}
      <div className="border-t border-border bg-surface px-5 py-3">
        <p className="text-xs font-medium text-fg">{meta.vibe}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{meta.description}</p>
      </div>
    </button>
  );
}
