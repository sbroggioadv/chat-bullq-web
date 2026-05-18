'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Lock,
  Check,
  AlertCircle,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/ui/image-upload';
import { useOrganizationProfile } from '../hooks/use-organization-profile';

/**
 * S19 Wave 1: aba `/settings/general`. Substitui placeholder "em breve".
 *
 * Estrutura:
 *   1. Header com logo (ImageUpload) + Nome (input) + slug/plano (read-only)
 *   2. Workspaces — lista de orgs do usuario + CTA "criar workspace" (stub modal)
 *
 * Premissas:
 *   - Forms simples => useState local + dirty manual (consistente com
 *     /settings/appearance/page.tsx). Sem react-hook-form pra esta tela.
 *   - Tokens CSS Waves 4.4-4.6: bg-card, text-fg, bg-muted, border-border,
 *     bg-primary. Zero zinc hardcoded.
 *   - RBAC: backend ja barra AGENT em PATCH /organizations/current (403).
 *     UI desabilita controles + mostra "Restrito".
 *   - Multi-workspace real fica pra S19 Wave 2 — botao "Criar workspace"
 *     abre modal stub.
 */
const MIN_NAME = 2;
const MAX_NAME = 120;

export function OrganizationGeneralForm() {
  const { profile, isLoading, isError, save, isSaving, canEdit } = useOrganizationProfile();
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  // Sincroniza estado local quando o profile chega/atualiza
  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setLogoUrl(profile.logoUrl);
  }, [profile?.id, profile?.name, profile?.logoUrl]);

  const isDirty =
    profile !== undefined &&
    (name.trim() !== profile.name || logoUrl !== profile.logoUrl);

  const nameError = (() => {
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME) return `Mínimo ${MIN_NAME} caracteres`;
    if (trimmed.length > MAX_NAME) return `Máximo ${MAX_NAME} caracteres`;
    return null;
  })();

  const canSave = canEdit && isDirty && !nameError && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    const payload: { name?: string; logoUrl?: string | null } = {};
    if (profile && name.trim() !== profile.name) payload.name = name.trim();
    if (profile && logoUrl !== profile.logoUrl) payload.logoUrl = logoUrl;
    try {
      await save(payload);
    } catch {
      // Toast ja foi disparado pelo hook
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setName(profile.name);
    setLogoUrl(profile.logoUrl);
  };

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <AlertCircle className="size-5 shrink-0 text-destructive" />
        <div className="text-sm">
          <p className="font-medium text-fg">Não foi possível carregar as configurações</p>
          <p className="mt-1 text-fg-muted">
            Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render principal ──────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 1: Perfil da organização                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="org-profile-section">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-fg-muted" />
            <h2 id="org-profile-section" className="text-base font-semibold text-fg">
              Organização
            </h2>
            {!canEdit && (
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
            Dados básicos da sua banca. Aparecem no cabeçalho do sidebar e em todas as comunicações.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Logo */}
          <div className="mb-6">
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              shape="square"
              disabled={!canEdit}
              label="Logo da organização"
              description="PNG, JPG ou WebP, até 5MB. Aparece no cabeçalho do sidebar."
            />
          </div>

          {/* Nome */}
          <div className="mb-5">
            <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-fg">
              Nome da organização
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={MAX_NAME + 10}
              aria-invalid={Boolean(nameError) && name.length > 0}
              aria-describedby={nameError ? 'org-name-error' : undefined}
              className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-sm transition-colors placeholder:text-fg-muted/60 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Ex: Sbroggio Advocacia"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {nameError && isDirty ? (
                <p id="org-name-error" className="text-xs text-destructive">
                  {nameError}
                </p>
              ) : (
                <p className="text-xs text-fg-muted">
                  Entre {MIN_NAME} e {MAX_NAME} caracteres.
                </p>
              )}
              <p className="text-xs tabular-nums text-fg-muted">
                {name.length}/{MAX_NAME}
              </p>
            </div>
          </div>

          {/* Grid: slug + plano (read-only) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Slug */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
                Identificador (slug)
                <Lock className="size-3 text-fg-muted" aria-hidden />
              </label>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm text-fg-muted">
                <span className="truncate font-mono">{profile.slug}</span>
              </div>
              <p className="mt-1.5 text-xs text-fg-muted">
                Único e fixo. Usado em URLs internas.
              </p>
            </div>

            {/* Plano */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
                Plano atual
                <Lock className="size-3 text-fg-muted" aria-hidden />
              </label>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted px-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                  <Sparkles className="size-3" />
                  {profile.plan}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-fg-muted">
                Gerenciado pelo suporte. Fale com a equipe pra alterar.
              </p>
            </div>
          </div>

          {/* Footer com acoes */}
          {canEdit && (
            <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              {isDirty && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Salvar alterações
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 2: Workspaces                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="workspaces-section">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-fg-muted" />
            <h2 id="workspaces-section" className="text-base font-semibold text-fg">
              Workspaces
            </h2>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Organizações em que você participa. Cada workspace é isolado (clientes, canais, agentes
            e equipes próprios).
          </p>
        </header>

        <div className="space-y-2">
          {organizations.map((org) => {
            const isActive = org.id === activeOrgId;
            return (
              <div
                key={org.id}
                className={`flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors ${
                  isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                <Avatar
                  src={org.logoUrl ?? undefined}
                  initials={org.name?.slice(0, 2).toUpperCase()}
                  square
                  className="size-10 bg-primary text-xs text-primary-foreground"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-fg">{org.name}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <Check className="size-3" />
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-fg-muted">
                    @{org.slug} · {org.role.toLowerCase()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowCreateWorkspace(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-4 py-3 text-sm font-medium text-fg-muted transition-colors hover:border-primary/50 hover:bg-muted hover:text-fg sm:w-auto"
        >
          <Plus className="size-4" />
          Criar novo workspace
        </button>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL STUB — multi-workspace (S19 Wave 2)                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showCreateWorkspace && (
        <CreateWorkspaceModalStub onClose={() => setShowCreateWorkspace(false)} />
      )}
    </div>
  );
}

/**
 * Modal stub pra "Criar novo workspace". Multi-org real (criar tenant pelo
 * dashboard) vai ser S19 Wave 2 — aqui so explicamos pro Doc que esta vindo.
 */
function CreateWorkspaceModalStub({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <h3 id="create-workspace-title" className="text-base font-semibold text-fg">
              Criar novo workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          Em breve você vai poder criar e gerenciar múltiplos workspaces dentro do BullQ — uma
          banca para o escritório principal, outras para sub-clientes, parcerias ou negócios
          paralelos. Cada workspace é totalmente isolado (canais, agentes, equipes e dados
          próprios).
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Esta funcionalidade está prevista para a próxima onda da Sprint S19.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
