'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Mail, Lock, Check, AlertCircle } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { useUserProfile } from '../hooks/use-user-profile';

/**
 * S19 Wave 2: aba `/settings/profile`. Edicao do perfil do usuario logado.
 *
 * Estrutura:
 *   1. Header com avatar (ImageUpload shape=circle) + Nome (input) + email (read-only)
 *
 * Premissas:
 *   - Form simples => useState local + dirty manual (consistente com Wave 1).
 *   - Tokens CSS: bg-card, text-fg, bg-muted, border-border, bg-primary.
 *     Zero zinc hardcoded.
 *   - Sem RBAC — usuario sempre edita o proprio perfil. Email read-only (mudar
 *     email = fluxo separado de verificacao, fora do escopo desta wave).
 *   - Avatar do sidebar consome `user.avatarUrl` reativo (linha 118 do
 *     app-sidebar.tsx) — optimistic update aplica em <16ms.
 */
const MIN_NAME = 2;
const MAX_NAME = 120;

export function UserProfileForm() {
  const { user, save, isSaving } = useUserProfile();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sincroniza estado local quando o user troca (ex: switch de conta) ou quando
  // o backend retorna dados frescos via /auth/me invalidation.
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl);
  }, [user?.id, user?.name, user?.avatarUrl]);

  // ─── Empty state ───────────────────────────────────────────────────────
  // Defesa: se chegou aqui sem user, ProtectedLayout falhou. Mostra error
  // explicito em vez de skeleton perpetuo.
  if (!user) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <AlertCircle className="size-5 shrink-0 text-destructive" />
        <div className="text-sm">
          <p className="font-medium text-fg">Sessao expirada</p>
          <p className="mt-1 text-fg-muted">
            Faca login novamente para acessar seu perfil.
          </p>
        </div>
      </div>
    );
  }

  const isDirty =
    name.trim() !== user.name || avatarUrl !== user.avatarUrl;

  const nameError = (() => {
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME) return `Minimo ${MIN_NAME} caracteres`;
    if (trimmed.length > MAX_NAME) return `Maximo ${MAX_NAME} caracteres`;
    return null;
  })();

  const canSave = isDirty && !nameError && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    const payload: { name?: string; avatarUrl?: string | null } = {};
    if (name.trim() !== user.name) payload.name = name.trim();
    if (avatarUrl !== user.avatarUrl) payload.avatarUrl = avatarUrl;
    try {
      await save(payload);
    } catch {
      // Toast ja foi disparado pelo hook
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setAvatarUrl(user.avatarUrl);
  };

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECAO 1: Perfil do usuario                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="user-profile-section">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <UserCircle className="size-5 text-fg-muted" />
            <h2 id="user-profile-section" className="text-base font-semibold text-fg">
              Seu perfil
            </h2>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Como voce aparece para sua equipe. Sua foto e nome ficam visiveis no rodape do sidebar
            e em conversas onde voce atua.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Avatar */}
          <div className="mb-6">
            <ImageUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              shape="circle"
              placeholderIcon={UserCircle}
              label="Foto de perfil"
              description="PNG, JPG ou WebP, ate 5MB. Aparece como sua identidade no app."
            />
          </div>

          {/* Nome */}
          <div className="mb-5">
            <label htmlFor="user-name" className="mb-1.5 block text-sm font-medium text-fg">
              Nome completo
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME + 10}
              aria-invalid={Boolean(nameError) && name.length > 0}
              aria-describedby={nameError ? 'user-name-error' : undefined}
              className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-sm transition-colors placeholder:text-fg-muted/60 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Ex: Luis Sbroggio"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {nameError && isDirty ? (
                <p id="user-name-error" className="text-xs text-destructive">
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

          {/* Email (read-only) */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Mail className="size-3.5 text-fg-muted" aria-hidden />
              Email
              <Lock className="size-3 text-fg-muted" aria-hidden />
            </label>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm text-fg-muted">
              <span className="truncate">{user.email}</span>
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">
              Trocar email exige verificacao por seguranca. Fale com o suporte se precisar.
            </p>
          </div>

          {/* Footer com acoes */}
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
                  Salvar alteracoes
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
