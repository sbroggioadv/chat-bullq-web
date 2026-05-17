'use client';

/**
 * Sprint S18 Wave 3 Fase 4 — Theme Preview Mock
 * Sprint S18 Wave 4.1 — preview pinta TUDO (sidebar/bg/surface/fg/border)
 *
 * Mock visual estatico que renderiza usando as CSS vars custom in-memory
 * (`<style id="theme-tokens-preview">`). Diferente do `BrandThemeBridge` —
 * aquele aplica em producao (style id=theme-tokens-override), este aplica
 * SO dentro do container do preview via escopo CSS scoping com classe
 * unica e !important onde necessario.
 *
 * Wave 4.1: ANTES o preview usava bg/fg/sidebar HARDCODED por mode
 * (`oklch(0.18 0.01 250)` etc.). Doc reclamou que aplicar tema verde fluo
 * nao mudava sidebar visualmente no preview. AGORA: TODOS os tokens vem
 * das CSS vars custom — preview repinta sidebar/bg/fg em tempo real
 * conforme Doc mexe nos pickers da Fase 3.
 *
 * Estrutura espelha o app real:
 *  - Sidebar (com nav items)
 *  - 2 conversation list items
 *  - Chat com 2 message bubbles (sent + received)
 *  - Composer
 *  - Botoes accent/warning/danger
 */

import { MessageSquare, Hash, Bot, Send, Bell, Paperclip } from 'lucide-react';
import type { ThemePalette, ThemeDensity } from '../types/brand';
import { buildThemeOverrideCss } from '../util/derived-tokens.util';
import { useEffect, useId, useMemo } from 'react';

/**
 * Density tokens (subset duplicado pro preview). A versao "oficial" vive em
 * `derived-tokens.util.ts`. Mantemos esta copia local pro preview ser
 * autonomo (Fase 4 nao depende da Fase 5 do Wave 3 estar mergeada).
 */
const PREVIEW_DENSITY_TOKENS: Record<ThemeDensity, { pyList: string; pyRow: string }> = {
  compact: { pyList: '0.5rem', pyRow: '0.5rem' },
  comfortable: { pyList: '0.625rem', pyRow: '0.75rem' },
  spacious: { pyList: '0.875rem', pyRow: '1rem' },
};

function buildPreviewDensityBlock(density: ThemeDensity | undefined): string {
  if (!density || density === 'comfortable') return '';
  const t = PREVIEW_DENSITY_TOKENS[density];
  return `--density-py-list: ${t.pyList}; --density-py-row: ${t.pyRow};`;
}

interface ThemePreviewMockProps {
  light: ThemePalette;
  dark: ThemePalette;
  radius: string;
  density?: ThemeDensity;
  /** Mode que o preview esta simulando (afeta bg/text). */
  mode: 'light' | 'dark';
}

export function ThemePreviewMock({ light, dark, radius, density, mode }: ThemePreviewMockProps) {
  const scopeId = useId().replace(/:/g, '');
  const scopeClass = `theme-preview-${scopeId}`;

  // Calcula CSS override e injeta scoped style
  const cssText = useMemo(() => {
    try {
      // Wave 4.1: passa palette completa (14 cores). buildThemeOverrideCss
      // emite 22+ vars CSS incluindo sidebar/bg/surface/fg/border. Preview
      // herda todas — bg do container do preview, sidebar do nav lateral,
      // surface dos cards, etc.
      const built = buildThemeOverrideCss({ light, dark, radius });
      const densityBlock = buildPreviewDensityBlock(density);
      // Escopamos pela classe do container; usamos !important pra ganhar
      // de `html[data-mode]` (specificity 0,1,1 vs nossa 0,2,0 com !important).
      // Cada declaracao precisa ter !important — fazemos isso via regex.
      const importantize = (block: string) =>
        block.replace(/;/g, ' !important;').replace(/!important !important/g, '!important');
      const lightBlock = importantize(built.light) + (densityBlock ? ' ' + importantize(densityBlock) : '');
      const darkBlock = importantize(built.dark) + (densityBlock ? ' ' + importantize(densityBlock) : '');
      const activeBlock = mode === 'dark' ? darkBlock : lightBlock;
      return `.${scopeClass} { ${activeBlock} }`;
    } catch {
      return '';
    }
  }, [light, dark, radius, density, mode, scopeClass]);

  // Injetamos um <style> dedicado pro preview (separado do override de prod)
  useEffect(() => {
    const styleId = `theme-preview-style-${scopeId}`;
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = cssText;
    return () => {
      style?.remove();
    };
  }, [cssText, scopeId]);

  // Wave 4.1: TUDO vem de CSS vars agora. Antes tinha bg/fg/sidebar/border
  // hardcoded por mode — agora preview pega `var(--bg)`, `var(--sidebar)`, etc.
  // Quando o tema custom emite essas vars, o preview reflete em tempo real.

  return (
    <div
      className={`${scopeClass} overflow-hidden rounded-xl border shadow-lg`}
      style={{
        background: 'var(--bg)',
        color: 'var(--fg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header preview */}
      <div
        className="flex items-center justify-between border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
      >
        <span>Preview · {mode}</span>
        <span className="font-mono text-[9px] opacity-60">live</span>
      </div>

      {/* Body em 2 colunas: sidebar + chat */}
      <div className="grid grid-cols-[140px_1fr]">
        {/* Sidebar — Wave 4.1: usa var(--sidebar) em vez de hardcoded */}
        <div
          className="flex flex-col border-r p-2"
          style={{
            background: 'var(--sidebar)',
            color: 'var(--sidebar-fg)',
            borderColor: 'var(--sidebar-border)',
          }}
        >
          <div className="space-y-1">
            <NavItem icon={<MessageSquare className="size-3.5" />} label="Inbox" active />
            <NavItem icon={<Bot className="size-3.5" />} label="Agentes" />
            <NavItem icon={<Hash className="size-3.5" />} label="Tags" />
            <NavItem icon={<Bell className="size-3.5" />} label="Avisos" />
          </div>

          <div
            className="mt-3 border-t pt-2"
            style={{ borderColor: 'var(--sidebar-border)' }}
          >
            <p className="px-1 text-[9px] font-semibold uppercase tracking-wider opacity-50">
              Conversas
            </p>
            <div className="mt-1 space-y-0.5">
              <ConvItem name="Maria L." preview="Ok, obrigada!" active />
              <ConvItem name="Joao R." preview="Posso pagar amanha?" />
            </div>
          </div>
        </div>

        {/* Chat — Wave 4.1: usa var(--surface) pra cards + var(--fg) pra texto */}
        <div className="flex flex-col" style={{ background: 'var(--bg)' }}>
          {/* Conv header */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              ML
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                Maria Lacanna
              </p>
              <p
                className="truncate text-[10px]"
                style={{ color: 'var(--fg-muted, var(--fg))', opacity: 0.7 }}
              >
                +55 17 9 8765-4321
              </p>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
              style={{ background: 'var(--success)', color: 'var(--success-fg)' }}
            >
              Ativa
            </span>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-2 px-3 py-3" style={{ minHeight: 100 }}>
            <Bubble incoming>Oi! Recebeu o boleto?</Bubble>
            <Bubble>Recebi sim, obrigada. Pago hoje a tarde.</Bubble>
          </div>

          {/* Composer */}
          <div
            className="flex items-center gap-2 border-t p-2"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              className="rounded p-1 opacity-60 hover:opacity-100"
              aria-label="Anexar"
              style={{ color: 'var(--fg)' }}
            >
              <Paperclip className="size-3.5" />
            </button>
            <div
              className="flex-1 rounded px-2 py-1 text-[11px] opacity-60"
              style={{ background: 'var(--bg-elev, var(--muted, var(--bg)))', color: 'var(--fg)' }}
            >
              Escreva uma mensagem…
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-fg)',
                borderRadius: 'var(--radius-md)',
              }}
              aria-label="Enviar"
            >
              <Send className="size-3" /> Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Buttons row pra mostrar danger/warning/accent */}
      <div
        className="flex flex-wrap gap-2 border-t px-3 py-2"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] font-semibold"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Acao accent
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] font-semibold"
          style={{
            background: 'var(--warning)',
            color: 'var(--warning-fg)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Atencao
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] font-semibold"
          style={{
            background: 'var(--danger)',
            color: 'var(--danger-fg)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

/**
 * NavItem da sidebar mock. Wave 4.1: usa var(--sidebar-accent) +
 * var(--sidebar-accent-fg) pro item ativo (em vez de var(--accent-soft)
 * que ia pegar do brand base).
 */
function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded px-2 text-[11px] font-medium [padding-block:var(--density-py-list,0.375rem)]"
      style={{
        background: active ? 'var(--sidebar-accent)' : 'transparent',
        color: active ? 'var(--sidebar-accent-fg)' : 'var(--sidebar-fg)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ConvItem({ name, preview, active }: { name: string; preview: string; active?: boolean }) {
  return (
    <div
      className="flex flex-col rounded px-2 text-[10px] [padding-block:var(--density-py-list,0.375rem)]"
      style={{
        background: active ? 'var(--sidebar-accent)' : 'transparent',
        color: active ? 'var(--sidebar-accent-fg)' : 'var(--sidebar-fg)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <p className="truncate font-semibold">{name}</p>
      <p className="truncate" style={{ opacity: 0.6 }}>
        {preview}
      </p>
    </div>
  );
}

/**
 * Bubble do chat. Wave 4.1: 2 variantes — incoming (cartao com var(--surface))
 * e outgoing (botao primary com var(--primary)). Antes a bubble usava cores
 * passadas por prop; agora pega das vars automaticamente.
 */
function Bubble({
  children,
  incoming,
}: {
  children: React.ReactNode;
  incoming?: boolean;
}) {
  const bg = incoming ? 'var(--surface-2, var(--surface))' : 'var(--primary)';
  const fg = incoming ? 'var(--fg)' : 'var(--primary-fg)';
  return (
    <div className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
      <div
        className="max-w-[75%] px-2.5 py-1.5 text-[11px]"
        style={{
          background: bg,
          color: fg,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
