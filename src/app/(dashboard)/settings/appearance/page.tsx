'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, User, Lock, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useOrgBrand } from '@/features/theme/hooks/use-org-brand';
import { ORG_BRANDS, type OrgBrand } from '@/features/theme/types/brand';
import { BrandPreviewCard } from '@/features/theme/components/brand-preview-card';
import { ThemeModeToggle } from '@/features/theme/components/theme-mode-toggle';
import { ThemePresetsSection } from '@/features/theme/components/theme-presets-section';

export default function SettingsAppearancePage() {
  const { brand, effectiveBrand, role, setBrand, isUpdating, themeTokens } = useOrgBrand();
  const [pending, setPending] = useState<OrgBrand | null>(null);

  const canEditBrand = role === 'OWNER' || role === 'ADMIN';
  const selected = pending ?? effectiveBrand;
  const hasChanges = pending !== null && pending !== brand;
  const hasCustomTheme = themeTokens !== null;

  const handleSave = async () => {
    if (!pending) return;
    await setBrand(pending);
    setPending(null);
  };

  return (
    <div className="space-y-10">
      {/* ─── Seção: Identidade visual da banca (org-level, OWNER/ADMIN) ─── */}
      <section aria-labelledby="brand-section">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-fg-muted" />
            <h2 id="brand-section" className="text-base font-semibold text-fg">
              Identidade visual da banca
            </h2>
            {!canEditBrand && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted"
                title="Apenas OWNER/ADMIN podem alterar"
              >
                <Lock className="size-3" />
                Restrito
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Define a aparência do BullQ para todos os membros da organização.{' '}
            {canEditBrand
              ? 'Mudanças aplicam imediatamente.'
              : 'Apenas o OWNER ou ADMIN pode mudar.'}
          </p>
        </header>

        <div
          role="radiogroup"
          aria-label="Identidade visual da banca"
          aria-disabled={!canEditBrand || isUpdating}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {ORG_BRANDS.map((b) => (
            <BrandPreviewCard
              key={b}
              brand={b}
              selected={selected === b}
              onSelect={(next) => canEditBrand && setPending(next)}
              disabled={!canEditBrand || isUpdating}
              size="md"
            />
          ))}
        </div>

        {canEditBrand && (
          <div className="mt-5 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {hasChanges && (
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={isUpdating}
                className="text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? 'Salvando…' : 'Aplicar para toda a banca'}
            </button>
          </div>
        )}

        {/* ─── Custom Theme Builder (Sprint S18 Wave 3) ─── */}
        {canEditBrand && (
          <div className="mt-6">
            <Link
              href="/settings/appearance/builder"
              className="group flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5 transition-all hover:border-primary hover:from-primary/10 hover:to-accent/10"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-fg">Theme Builder Custom</h3>
                    {hasCustomTheme && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="size-3" /> Ativo
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {hasCustomTheme
                      ? `Tema customizado aplicado (base: ${themeTokens?.base}). Clique pra editar.`
                      : 'Edite cores OKLCH + radius + densidade com preview live e validacao WCAG.'}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-fg-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>
        )}
      </section>

      {/* ─── Seção: Biblioteca de presets (Sprint S18 Wave 4) ─── */}
      <ThemePresetsSection canEdit={canEditBrand} />

      {/* ─── Seção: Tema pessoal (user-level, qualquer membro) ─── */}
      <section aria-labelledby="mode-section" className="border-t border-border pt-10">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <User className="size-5 text-fg-muted" />
            <h2 id="mode-section" className="text-base font-semibold text-fg">
              Seu tema
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              Pessoal
            </span>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Preferência salva só pra você, neste navegador. Não afeta outros membros da banca.
          </p>
        </header>

        <ThemeModeToggle variant="expanded" />

        <p className="mt-3 text-xs text-fg-subtle">
          <strong className="text-fg-muted">Sistema</strong> respeita a preferência de dark/light
          do seu sistema operacional automaticamente.
        </p>
      </section>
    </div>
  );
}
