# Evidências — SPEC-023 WEB-1

Execução no worktree `/Users/luissbroggio/AIOX-enterprise/apps/bullq2/worktrees/web-spec023-1`, branch `spec023/web-1`.

- `yarn install --frozen-lockfile`: exit 0, `Done in 7.15s`; lockfile inalterado. Yarn 1.22.22, Node 24.
- `yarn vitest run src/features/inbox/components/contact-panel/spec023.test.tsx --maxWorkers=2` antes da implementação: exit 1, import de MuteButton inexistente. Primeiro registro red de scaffolding, não falha comportamental.
- `yarn vitest run src/features/inbox/services/clickup-inbox.clip.test.ts --maxWorkers=2` antes do reparo F9: exit 1, 5 falharam e 4 passaram. Falhas comportamentais: texto enviado como attachment; erro ao buscar projeto bloqueia incorporação; erro de resolve é engolido.
- Primeira rodada global: `yarn vitest run --maxWorkers=2`: exit 0, **70 arquivos / 365 testes**, 63,76 s. Inclui F1/F4/F7/F8 e F9; anterior à extensão do Gmail.
- Rodada dirigida com extensão Gmail: `yarn vitest run src/features/inbox/components/contact-panel/spec023.test.tsx src/features/inbox/services/conversation-actions.service.test.ts src/features/inbox/services/clickup-inbox.clip.test.ts --maxWorkers=2`: exit 0, **3 arquivos / 38 testes**, 3,82 s.
- Rodada global final: `yarn vitest run --maxWorkers=2`: exit 0, **71 arquivos / 374 testes**, 159,35 s. Nenhum timeout ou assertion foi alterado.
- Gmail isolado: `yarn vitest run src/features/email/components/email-compose.spec023.test.tsx --maxWorkers=2 --reporter=verbose`: exit 0, **1 teste**, envio mockado por `emailService.compose`.
- `yarn tsc --noEmit`: exit 0, `Done in 9.89s` na rodada final.
- `yarn eslint` nos 15 arquivos de código/testes tocados: exit 0, **0 erros, 3 warnings**. Os três warnings de `chat-panel.tsx` já existem em HEAD anterior (duas tags img e dependência de useCallback). Controle: `git show HEAD:src/features/inbox/components/chat-panel.tsx > .aiox/companions/spec023-web-1/chat-panel-baseline.tsx` antes dos commits; `yarn eslint .aiox/companions/spec023-web-1/chat-panel-baseline.tsx --no-ignore`: mesmos 3 warnings. Demais arquivos sem avisos. Não declarar lint global sem ressalva.
- `git diff --check HEAD~2 HEAD`: exit 0 no worktree do setor; `contact-workspace-panel.tsx` sem diff.
- Playwright em Vite local (`.aiox/companions/spec023-web-1/visual-vite.mjs`): componentes reais importados do src com adapter Axios sintético, sem backend. Viewports 1440×1000 e 390×1000; largura do documento igual à viewport, sem overflow horizontal. Gmail abre dialog existente e destinatário `demonstracao@example.test`.

Capturas: `/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/` (f1/f4/f7/f8/f9 × 1440/390; mais f8-gmail × 1440/390).

A evidência de acesso negado usa mocks de HTTP/serviço; não prova autorização de backend. Capturas são de componentes isolados com dados sintéticos; não são aceite visual final do aplicativo integrado.
