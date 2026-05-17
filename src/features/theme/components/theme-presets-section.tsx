/**
 * Sprint S18 Wave 4 — Theme Presets Library (Fase 3 UI)
 *
 * Seção "Meus temas customizados" na página /settings/appearance.
 * Renderiza grid de cards + card "+ Criar novo" + dialogs de duplicar/deletar.
 *
 * Lógica de mutations via `useThemePresets`. Sem refetch manual — react-query
 * cuida via cache + invalidates.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Palette, Plus, X, AlertTriangle } from 'lucide-react';
import { useThemePresets } from '../hooks/use-theme-presets';
import type { ThemePreset } from '../services/theme-presets.service';
import { ThemePresetCard } from './theme-preset-card';

interface Props {
  canEdit: boolean;
}

export function ThemePresetsSection({ canEdit }: Props) {
  const {
    presets,
    isLoading,
    error,
    create,
    isCreating,
    remove,
    isRemoving,
    activate,
    isActivating,
  } = useThemePresets();

  // Dialog de duplicação
  const [dupTarget, setDupTarget] = useState<ThemePreset | null>(null);
  const [dupName, setDupName] = useState('');

  // Dialog de delete
  const [deleteTarget, setDeleteTarget] = useState<ThemePreset | null>(null);

  if (!canEdit) {
    return null; // Não renderiza pra AGENT — restrito a OWNER/ADMIN
  }

  async function handleDuplicate() {
    if (!dupTarget || !dupName.trim()) return;
    await create({ name: dupName.trim(), tokens: dupTarget.tokens });
    setDupTarget(null);
    setDupName('');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <section
      aria-labelledby="presets-section"
      className="border-t border-border pt-10"
    >
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-fg-muted" />
          <h2 id="presets-section" className="text-base font-semibold text-fg">
            Meus temas customizados
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            Biblioteca
          </span>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Salva variações nomeadas do tema (Black Friday, Verão, evento X) e
          alterna entre elas sem perder as outras. Apenas 1 fica ativo por vez.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
          Carregando temas…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erro ao carregar temas: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.length === 0 ? null : (
            presets.map((p) => (
              <ThemePresetCard
                key={p.id}
                preset={p}
                isPending={isActivating || isRemoving}
                onActivate={(id) => activate(id)}
                onDuplicate={(preset) => {
                  setDupTarget(preset);
                  setDupName(`${preset.name} (cópia)`);
                }}
                onDelete={(preset) => setDeleteTarget(preset)}
              />
            ))
          )}

          {/* Card de criar novo — sempre presente */}
          <Link
            href="/settings/appearance/builder"
            className="group flex min-h-[110px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 p-4 text-center transition-all hover:border-primary hover:from-primary/10 hover:to-accent/10"
          >
            <div className="flex flex-col items-center gap-2 text-fg-muted group-hover:text-primary">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Plus className="size-4" />
              </span>
              <span className="text-xs font-semibold">Criar novo tema</span>
            </div>
          </Link>
        </div>
      )}

      {presets.length === 0 && !isLoading && (
        <p className="mt-3 text-xs text-fg-subtle">
          Nenhum tema customizado ainda. Clique em <strong>Criar novo tema</strong>{' '}
          pra começar.
        </p>
      )}

      {/* ─── Dialog: Duplicar preset ─── */}
      {dupTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDupTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-fg">Duplicar tema</h3>
                <p className="mt-1 text-xs text-fg-muted">
                  Cria uma cópia dos tokens com novo nome. Não ativa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDupTarget(null)}
                className="inline-flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </header>

            <label className="block">
              <span className="text-xs font-medium text-fg">Nome do novo tema</span>
              <input
                type="text"
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                maxLength={80}
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: Black Friday 2026"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDupTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-fg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isCreating || !dupName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? 'Duplicando…' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dialog: Deletar preset ─── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertTriangle className="size-4" />
              </span>
              <h3 className="text-sm font-semibold text-fg">Deletar tema</h3>
            </header>

            <p className="text-xs text-fg-muted">
              Tem certeza que quer remover <strong className="text-fg">"{deleteTarget.name}"</strong>?
              {deleteTarget.isActive && (
                <>
                  {' '}
                  Esse é o tema <strong>ativo</strong> — a banca voltará pro brand
                  base assim que confirmar.
                </>
              )}{' '}
              Esta ação não pode ser desfeita.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-fg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isRemoving}
                className="rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemoving ? 'Deletando…' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
