'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { DEFAULT_BRAND, isOrgBrand } from '../types/brand';

/**
 * Propaga o brand da org ativa pro `<html data-brand="...">`. Roda só no
 * client (efeito em mount + reativo a mudanças do auth-store). Antes do
 * auth hidratar, o boot default vem do `<html data-brand="A">` setado no
 * RootLayout — então não tem flicker visual.
 *
 * Também suporta query param `?brand=A|B|C` pra preview/QA em rotas
 * públicas (mockups, landing de testes) sem precisar de auth.
 */
export function BrandThemeBridge() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;

    // Override por query param tem precedência (pra QA visual)
    const params = new URLSearchParams(window.location.search);
    const queryBrand = params.get('brand');
    if (isOrgBrand(queryBrand)) {
      html.setAttribute('data-brand', queryBrand);
      return;
    }

    const activeOrg = organizations.find((o) => o.id === activeOrgId);
    const resolved = isOrgBrand(activeOrg?.brand) ? activeOrg!.brand! : DEFAULT_BRAND;
    html.setAttribute('data-brand', resolved);
  }, [activeOrgId, organizations]);

  return null;
}
