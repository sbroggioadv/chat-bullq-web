'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { SettingsSaveBar } from '@/features/settings/components/settings-save-bar';
import { useEffect, useState } from 'react';
import {
  Building2,
  Lock,
  Check,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/ui/image-upload';
import { useOrganizationProfile } from '@/features/settings/hooks/use-organization-profile';
import { useCreateOrganization } from '@/features/settings/hooks/use-create-organization';

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

  const [draftName, setName] = useState<string | undefined>();
  const name = draftName ?? profile?.name ?? '';
  const [draftLogo, setLogoUrl] = useState<string | null | undefined>();
  const logoUrl = draftLogo !== undefined ? draftLogo : profile?.logoUrl ?? null;
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

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
      setName(undefined); setLogoUrl(undefined);
    } catch {
      // Toast ja foi disparado pelo hook
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setName(undefined);
    setLogoUrl(undefined);
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
    <div className="space-y-5">
      {!canEdit && <p className="flex items-center gap-2 text-xs text-[var(--bq-t3)]"><Lock size={13} /> Apenas proprietário e administrador podem alterar estes dados.</p>}
      <section className={styles.block} aria-label="Dados da organização">
        <div className={styles.photoRow}>
          <div className={styles.photoText}><h3>Logo</h3><p>PNG, JPG ou WebP, até 5 MB. Aparece no topo do menu.</p></div>
          <div className={styles.avatarUpload}><ImageUpload value={logoUrl} onChange={setLogoUrl} shape="square" disabled={!canEdit} /></div>
        </div>
        <div className={styles.fieldRow}><SettingRow title="Nome do escritório"><div className={styles.fieldControl}>
          <input aria-label="Nome da organização" value={name} onChange={event => setName(event.target.value)} disabled={!canEdit} maxLength={MAX_NAME} aria-invalid={Boolean(nameError) && name.length > 0} aria-describedby="org-name-help" />
          <p id="org-name-help" className={nameError && isDirty ? styles.fieldError : 'sr-only'}>{nameError && isDirty ? nameError : `${name.length}/${MAX_NAME} caracteres`}</p>
        </div></SettingRow></div>
        <div className={styles.fieldRow}><SettingRow title="Identificador" description="Único e fixo. Usado nas URLs internas."><input aria-label="Identificador" value={profile.slug} readOnly /></SettingRow></div>
        <SettingRow title="Plano" description="Gerenciado pelo suporte. Fale com a equipe para alterar."><span className="bq-pill">{profile.plan}</span></SettingRow>
      </section>
      <section aria-labelledby="workspaces-section">
        <h2 id="workspaces-section" className={styles.sectionTitle}>Workspaces</h2>
        <div className={styles.block}>
          {organizations.map(org => <div className={styles.listRow} key={org.id}>
            <Avatar src={org.logoUrl ?? undefined} initials={org.name?.slice(0,2).toUpperCase()} square className="size-8" />
            <div className={styles.rowText}><h3>{org.name}</h3><p>@{org.slug} · {org.role.toLowerCase()}</p></div>
            {org.id === activeOrgId && <span className="bq-pill"><Check size={12} /> Atual</span>}
          </div>)}
          <SettingRow title="Novo workspace" description="Outro escritório, com canais, equipe e dados separados."><Button onClick={() => setShowCreateWorkspace(true)}><Plus size={13} /> Criar workspace</Button></SettingRow>
        </div>
      </section>
      {canEdit && <SettingsSaveBar dirty={isDirty} saving={isSaving} disabled={!canSave} onSave={() => void handleSave()} onDiscard={handleCancel} />}
      {showCreateWorkspace && <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />}
    </div>
  );
}

/**
 * S19 Wave 3: modal real pra criar workspace adicional. Substitui o stub da
 * Wave 1. Form simples: input nome + Criar/Cancelar. Em sucesso, hook faz
 * hard reload pra recarregar contexto inteiro com nova org ativa.
 */
const NEW_WORKSPACE_MIN_NAME = 2;
const NEW_WORKSPACE_MAX_NAME = 120;

function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const { create, isCreating } = useCreateOrganization();
  const [name, setName] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isCreating]);

  const trimmed = name.trim();
  const nameError = (() => {
    if (trimmed.length < NEW_WORKSPACE_MIN_NAME) {
      return `Mínimo ${NEW_WORKSPACE_MIN_NAME} caracteres`;
    }
    if (trimmed.length > NEW_WORKSPACE_MAX_NAME) {
      return `Máximo ${NEW_WORKSPACE_MAX_NAME} caracteres`;
    }
    return null;
  })();
  const canSubmit = !nameError && !isCreating;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    try {
      await create({ name: trimmed });
      // Modal nao fecha — toast de sucesso + reload acontecem no hook.
      // Doc ve "Recarregando..." e pagina muda.
    } catch {
      // Toast ja foi disparado pelo hook em onError.
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !isCreating && onClose()}
    >
      <form
        onSubmit={handleSubmit}
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
            disabled={isCreating}
            className="rounded-lg p-1 text-fg-muted transition-colors hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-fg-muted">
          Cada workspace é totalmente isolado — canais, agentes, equipes e dados próprios.
          Você será o owner do novo workspace.
        </p>

        <div className="mt-5">
          <label
            htmlFor="new-workspace-name"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Nome do workspace
          </label>
          <input
            id="new-workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isCreating}
            autoFocus
            maxLength={NEW_WORKSPACE_MAX_NAME + 10}
            aria-invalid={Boolean(nameError) && name.length > 0}
            aria-describedby={nameError && name.length > 0 ? 'new-workspace-name-error' : undefined}
            className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-sm transition-colors placeholder:text-fg-muted/60 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ex: Sbroggio Sub-cliente"
          />
          <div className="mt-1.5 flex items-center justify-between">
            {nameError && name.length > 0 ? (
              <p id="new-workspace-name-error" className="text-xs text-destructive">
                {nameError}
              </p>
            ) : (
              <p className="text-xs text-fg-muted">
                Você poderá alterar depois em Configurações.
              </p>
            )}
            <p className="text-xs tabular-nums text-fg-muted">
              {name.length}/{NEW_WORKSPACE_MAX_NAME}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Criando…
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Criar workspace
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
