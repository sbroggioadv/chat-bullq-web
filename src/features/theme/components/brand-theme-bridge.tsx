'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { DEFAULT_BRAND, isOrgBrand, type ThemeTokens } from '../types/brand';
import { buildThemeOverrideCss } from '../util/derived-tokens.util';

/**
 * Propaga o brand da org ativa pro `<html data-brand="...">`. Roda so no
 * client (efeito em mount + reativo a mudancas do auth-store). Antes do
 * auth hidratar, o boot default vem do `<html data-brand="A">` setado no
 * RootLayout — entao nao tem flicker visual.
 *
 * Tambem suporta query param `?brand=A|B|C` pra preview/QA em rotas
 * publicas (mockups, landing de testes) sem precisar de auth.
 *
 * Sprint S18 Wave 3: quando a org tem `themeTokens` setados, injetamos
 * um <style id="theme-tokens-override"> com CSS vars override pros 13
 * tokens funcionais (primary/accent/success/warning/danger + variantes
 * derivadas) + 4 radius. Bg/fg/surface/sidebar continuam vindo do brand
 * base — Doc customiza so as 5 cores funcionais + radius, o resto herda
 * pra preservar identidade dark/light coerente.
 */

const STYLE_ID = 'theme-tokens-override';

function applyThemeTokens(tokens: ThemeTokens | null): void {
  // Remove qualquer override anterior
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();

  if (!tokens) return;

  try {
    const css = buildThemeOverrideCss({
      light: tokens.light,
      dark: tokens.dark,
      radius: tokens.radius,
    });

    // Selector dual (light vs dark) ancora pelo data-mode do <html>.
    // !important nao e necessario: ganhamos por specificity (selector tem
    // 1 elemento + 1 atributo, mesma do brand base mas vem depois no DOM).
    const styleContent = `
html[data-mode="light"] { ${css.light} }
html[data-mode="dark"] { ${css.dark} }
`.trim();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = styleContent;
    document.head.appendChild(style);
  } catch (err) {
    // Tokens com OKLCH invalido nao deveriam chegar aqui (validacao client+
    // server na save). Mas se vier corrompido, removemos override e logamos
    // — UI volta ao brand puro sem quebrar.
    if (typeof console !== 'undefined') {
      console.warn('[BrandThemeBridge] themeTokens invalidos, fallback pro brand:', err);
    }
  }
}

export function BrandThemeBridge() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;

    // Override por query param tem precedencia (pra QA visual)
    const params = new URLSearchParams(window.location.search);
    const queryBrand = params.get('brand');
    if (isOrgBrand(queryBrand)) {
      html.setAttribute('data-brand', queryBrand);
      // Query brand override desabilita custom tokens (modo QA puro)
      applyThemeTokens(null);
      return;
    }

    const activeOrg = organizations.find((o) => o.id === activeOrgId);
    const resolved = isOrgBrand(activeOrg?.brand) ? activeOrg!.brand! : DEFAULT_BRAND;
    html.setAttribute('data-brand', resolved);

    // Aplica/remove tokens customizados. null = remove override (volta ao brand puro).
    applyThemeTokens(activeOrg?.themeTokens ?? null);
  }, [activeOrgId, organizations]);

  return null;
}
