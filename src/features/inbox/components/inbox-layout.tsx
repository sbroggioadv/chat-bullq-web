'use client';

import { type ReactNode, useCallback, useRef } from 'react';
import {
  Group,
  Panel,
  type PanelImperativeHandle,
  Separator,
} from 'react-resizable-panels';
import {
  INBOX_COL_DEFAULT,
  INBOX_COL_MAX,
  INBOX_COL_MIN,
  useInboxColumnWidth,
} from '../hooks/use-inbox-column-width';

interface InboxLayoutProps {
  list: ReactNode;
  panel: ReactNode;
}

/**
 * Layout horizontal do inbox: coluna de conversas redimensionável à
 * esquerda, painel da thread (ou empty state) à direita.
 *
 * Em viewports `< md` (768px) cai num layout flex simples — sem handle
 * de resize, sem ARIA separator — pois a coluna ocupa a tela toda e
 * o chat-panel é renderizado abaixo (Comportamento legado preservado:
 * o `<div className="flex h-full">` original).
 *
 * Persistência: a largura é salva em px no localStorage via o hook
 * `use-inbox-column-width`. Double-click no handle reseta para 320px
 * (override do default da lib — que resetaria pro último `defaultSize`,
 * ou seja, o último valor persistido — comportamento errado pra nós).
 */
export function InboxLayout({ list, panel }: InboxLayoutProps) {
  const { width, setWidth, isResizable, isHydrating } = useInboxColumnWidth();
  const listPanelRef = useRef<PanelImperativeHandle | null>(null);

  // Persiste APENAS quando o usuário soltou o mouse (onLayoutChanged,
  // não onLayoutChange) — evita 60 escritas por segundo durante o drag.
  const lastPersistedRef = useRef<number>(width);
  const handleLayoutChanged = useCallback(() => {
    // O `Layout` map vem em flexGrow (não em px) — fica mais barato
    // medir o DOM real do panel pra capturar o px exato após o snap
    // dos constraints min/max. Isso garante que o reload restaura
    // exatamente o que o usuário viu, não uma fração arredondada.
    const el = document.querySelector<HTMLDivElement>(
      '[data-inbox-list-panel]',
    );
    const px = el?.getBoundingClientRect().width;
    if (!px || Number.isNaN(px)) return;
    const rounded = Math.round(px);
    if (rounded === lastPersistedRef.current) return;
    lastPersistedRef.current = rounded;
    setWidth(rounded);
  }, [setWidth]);

  const resetToDefault = useCallback(() => {
    listPanelRef.current?.resize(`${INBOX_COL_DEFAULT}px`);
    // `resize` dispara onLayoutChanged → setWidth roda em sequência,
    // então não precisamos persistir manualmente aqui.
  }, []);

  // Mobile / SSR primeira pintura → layout antigo, sem panel group.
  // Isso preserva o comportamento histórico (ConversationList com
  // `w-full` cresce até o limite do flex pai). O `isHydrating` evita
  // que o servidor renderize um `width` salvo no localStorage do
  // cliente (causaria hydration mismatch) — durante o primeiro frame
  // do client, o caller verá um layout fixo de 320px (o default do
  // ConversationList via min-width). Após hidratação, expande pro
  // valor salvo. Esse frame extra é imperceptível e é o trade-off
  // padrão de qualquer "persisted layout" em SSR.
  if (!isResizable || isHydrating) {
    return (
      <div className="flex h-full">
        <div
          className="shrink-0"
          style={{
            // No mobile a coluna some virtualmente quando o usuário
            // abre uma conversa — mas isso é trabalho de uma futura
            // sprint mobile-first. Por ora mantemos a largura default
            // pra paridade visual com antes do resize.
            width: isResizable ? width : INBOX_COL_DEFAULT,
          }}
        >
          {list}
        </div>
        <div className="flex min-w-0 flex-1">{panel}</div>
      </div>
    );
  }

  return (
    <Group
      orientation="horizontal"
      className="flex h-full w-full"
      onLayoutChanged={handleLayoutChanged}
    >
      <Panel
        id="inbox-list"
        panelRef={listPanelRef}
        defaultSize={`${width}px`}
        minSize={`${INBOX_COL_MIN}px`}
        maxSize={`${INBOX_COL_MAX}px`}
        className="flex"
      >
        {/* data-attr usado pelo handler de layout pra medir o px real
            após o snap dos constraints. Mais robusto que ler o flex-grow
            que a lib aplica no style inline do Panel. */}
        <div data-inbox-list-panel className="flex h-full w-full">
          {list}
        </div>
      </Panel>
      <Separator
        id="inbox-resize-handle"
        // `disableDoubleClick` desliga o reset embutido da lib (que
        // resetaria pro `defaultSize` do Panel — e o nosso defaultSize
        // é o valor persistido, não 320px). Em vez disso, capturamos
        // o duplo-click no DOM e chamamos resize(`320px`) manualmente.
        disableDoubleClick
        onDoubleClick={resetToDefault}
        className="group relative flex w-px shrink-0 cursor-ew-resize items-center justify-center bg-zinc-200/80 outline-none transition-colors hover:bg-primary/40 focus-visible:bg-primary dark:bg-zinc-800 dark:hover:bg-primary/60"
        aria-label="Redimensionar coluna de conversas (duplo-clique para reset)"
      >
        {/* Hit-area invisível 6px de cada lado pra facilitar agarrar
            o handle de 1px. Truque clássico de UX de separators —
            o usuário "agarra" no espaço maior mas o visual é fino. */}
        <span
          aria-hidden
          className="absolute inset-y-0 -left-1.5 -right-1.5"
        />
        {/* Indicador visual sutil no centro — aparece no hover/focus
            pra não poluir o layout em estado de repouso. */}
        <span
          aria-hidden
          className="pointer-events-none h-8 w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary"
        />
      </Separator>
      <Panel
        id="inbox-thread"
        className="flex min-w-0 flex-1"
        groupResizeBehavior="preserve-relative-size"
      >
        {panel}
      </Panel>
    </Group>
  );
}
