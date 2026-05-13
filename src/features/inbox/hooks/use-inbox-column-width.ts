'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Persiste a largura (em px) da coluna esquerda do inbox (conversation
 * list) entre sessões. Também detecta breakpoint `md` (768px) pra que o
 * caller possa desabilitar o resize em viewports mobile/tablet — onde
 * o layout volta a empilhar verticalmente.
 *
 * Decisões:
 * - Valor em **pixels** (não percentual). O usuário pensa em "quero
 *   ver nomes completos" — métrica visual, não fração da tela.
 * - Storage local (`localStorage`) e não preferences-service: é
 *   per-device (a largura ideal num laptop 13" != num monitor 27").
 * - SSR-safe: o `useState` recebe `DEFAULT` no primeiro render do
 *   server; a leitura do localStorage acontece no `useEffect` do
 *   client, evitando hydration mismatch.
 */

const STORAGE_KEY = 'bullq2.inboxColumnWidth';
export const INBOX_COL_DEFAULT = 320;
export const INBOX_COL_MIN = 240;
export const INBOX_COL_MAX = 480;

// Tailwind v4 `md:` breakpoint. Abaixo disso, devolvemos
// `isResizable = false` e o caller renderiza layout fixo (sem panel).
const MD_BREAKPOINT_PX = 768;

function clamp(value: number): number {
  if (Number.isNaN(value)) return INBOX_COL_DEFAULT;
  return Math.min(INBOX_COL_MAX, Math.max(INBOX_COL_MIN, Math.round(value)));
}

function readStored(): number {
  if (typeof window === 'undefined') return INBOX_COL_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INBOX_COL_DEFAULT;
    const parsed = Number(raw);
    return clamp(parsed);
  } catch {
    // Storage indisponível (modo privado, quota, etc.) — usa default
    // silenciosamente. Não é caminho crítico.
    return INBOX_COL_DEFAULT;
  }
}

interface UseInboxColumnWidthResult {
  /** Largura atual em px (entre MIN e MAX). */
  width: number;
  /** Persiste novo valor e atualiza estado local. */
  setWidth: (next: number) => void;
  /** false em viewports < md (768px). Caller renderiza layout fixo. */
  isResizable: boolean;
  /**
   * true até o hook ler o localStorage no efeito de mount. Permite ao
   * caller adiar render do PanelGroup pra evitar layout shift entre o
   * default SSR e o valor restaurado (a lib não tem SSR nativo de
   * tamanho persistido em px).
   */
  isHydrating: boolean;
}

export function useInboxColumnWidth(): UseInboxColumnWidthResult {
  const [width, setWidthState] = useState<number>(INBOX_COL_DEFAULT);
  const [isResizable, setIsResizable] = useState<boolean>(true);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  // Hidrata do localStorage no mount. Isso vive num efeito (não no
  // initializer do useState) pra não quebrar SSR — o servidor não tem
  // window. Trade-off aceito: 1 frame com DEFAULT até o useEffect rodar.
  useEffect(() => {
    setWidthState(readStored());
    setIsHydrating(false);
  }, []);

  // Observa o breakpoint `md`. Usa matchMedia + listener (não resize)
  // pra evitar work em cada pixel de redimensionamento da janela.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(`(min-width: ${MD_BREAKPOINT_PX}px)`);
    const apply = () => setIsResizable(mql.matches);
    apply();
    // `addEventListener('change', ...)` é o caminho moderno; Safari
    // < 14 caía no `addListener`, mas o projeto exige Next 16 / React 19
    // que já implicam navegadores modernos. Mantemos o moderno.
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const setWidth = useCallback((next: number) => {
    const clamped = clamp(next);
    setWidthState(clamped);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // Mesmo motivo do readStored: ignora silenciosamente.
    }
  }, []);

  return { width, setWidth, isResizable, isHydrating };
}
