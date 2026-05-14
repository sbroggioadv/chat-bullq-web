'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { Sparkles } from 'lucide-react';
import { useOrgBrand } from '../hooks/use-org-brand';
import { DEFAULT_BRAND, ORG_BRANDS, type OrgBrand } from '../types/brand';
import { BrandPreviewCard } from './brand-preview-card';

/**
 * Modal full-screen que dispara automaticamente quando o OWNER de uma org
 * entra no dashboard pela primeira vez (org.brand === null). Apresenta os
 * 3 brands lado a lado e força uma escolha — ou skip explícito pro default.
 *
 * O modal NÃO tem botão "fechar" no canto (X) de propósito: a decisão é
 * meaningful pra banca toda, então oferecemos `Pular por agora` que faz
 * PATCH com 'A' (default) ao invés de simplesmente fechar — pra evitar
 * que o wizard reapareça no próximo refresh.
 */
export function BrandOnboardingWizard() {
  const { needsOnboarding, setBrand, isUpdating } = useOrgBrand();
  const [pending, setPending] = useState<OrgBrand | null>(null);

  const handleConfirm = async () => {
    if (!pending) return;
    await setBrand(pending);
  };

  const handleSkip = async () => {
    // Skip = persistir default explicitamente (não deixa null pra não reabrir)
    await setBrand(DEFAULT_BRAND);
  };

  return (
    <Dialog
      open={needsOnboarding}
      onClose={() => {
        /* Modal não fecha clicando fora — escolha é meaningful */
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel className="mx-auto max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-background shadow-2xl ring-1 ring-border">
          <div className="p-6 sm:p-10">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Configuração inicial · Identidade visual
                </p>
                <DialogTitle className="mt-1 text-2xl font-bold text-fg sm:text-3xl">
                  Escolha a identidade da sua banca
                </DialogTitle>
                <Description className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-base">
                  Essa decisão define como o BullQ vai aparecer para todos os membros
                  da sua organização. Você pode mudar depois em{' '}
                  <span className="font-medium text-fg">Configurações &rsaquo; Aparência</span>.
                </Description>
              </div>
            </div>

            {/* Grid de 3 brands */}
            <div
              role="radiogroup"
              aria-label="Identidade visual"
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {ORG_BRANDS.map((b) => (
                <BrandPreviewCard
                  key={b}
                  brand={b}
                  selected={pending === b}
                  onSelect={setPending}
                  disabled={isUpdating}
                />
              ))}
            </div>

            {/* Footer: actions */}
            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isUpdating}
                className="text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
              >
                Pular e usar o tema padrão (Sbroggio Graphite)
              </button>

              <div className="flex items-center gap-3">
                {pending && (
                  <p className="hidden text-xs text-fg-muted sm:block">
                    Você pode trocar a qualquer momento.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!pending || isUpdating}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdating ? 'Salvando…' : 'Aplicar e continuar'}
                </button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
