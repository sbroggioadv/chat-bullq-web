# Relatório final — SPEC-023 WEB-1

Implementação local concluída para integração. Branch `spec023/web-1` no worktree `/Users/luissbroggio/AIOX-enterprise/apps/bullq2/worktrees/web-spec023-1`.

## Entrega

| Função | Implementação | Verificação |
|---|---|---|
| F1 | `MuteButton({ conversation })`: 1 h, 8 h, 24 h, sempre, reativar; estado até quando; expiração; erro visível; invalidação de cache. | Menu/PATCH, estado, reativação, silêncio expirado e organização diferente. |
| F4 | `NotesSection({ conversationId })`: lista, criação, edição e exclusão confirmada somente das próprias notas; 1–4.000 caracteres; erro e vazio. | CRUD, validação, autoria e falhas HTTP mockadas. Nunca chama endpoint de mensagens. |
| F7 | `NegotiationJourney({ conversation })`: cards reais da conversa, estágios ordenados, estágio atual e valor/moeda do card. | Valor real, estado vazio, erro e bloqueio de organização diferente. |
| F8 | Menu de envio consulta send-channels e chama open antes de trocar. Canais indisponíveis mostram motivo. WhatsApp navega à conversa; Gmail abre EmailCompose existente com conta e destinatário da conversa destino. | Lista, grupo indisponível, vazio, erro ao abrir, Escape, abertura Gmail e envio por emailService.compose mockado. |
| F9 | Clipe usa comment para texto e attachment para mídia; erros ClickUp/dossiê independentes; confirmação de sucesso no ClickUp. Painel mostra falhas de carregamento/incorporação e aceita mídia persistida por tipo. | 5 testes comportamentais falharam antes do reparo; todos verdes depois. Inclui falha de dossiê e acesso negado. |

## Arquivos

Novos: `src/features/inbox/components/contact-panel/{mute-button,notes-section,negotiation-journey,send-channel-menu}.tsx`, `spec023.test.tsx` nessa pasta, `src/features/inbox/services/conversation-actions.service.ts` e teste, `src/features/email/components/email-compose.spec023.test.tsx`.

Alterados: `chat-input.tsx`, regiões mínimas F9 de `chat-panel.tsx` e `clickup-panel.tsx`, `clickup-inbox.service.ts` e teste, `pipelines.service.ts` (tipagem dos campos value/currency já retornados), `email-compose.tsx` (initialTo opcional). **contact-workspace-panel.tsx não foi alterado**.

## Commits locais

- `628739f` — feat(inbox): corrigir incorporação de mensagens no ClickUp.
- `f933e01` — feat(inbox): ligar silêncio notas jornada e canais de envio.
- Evidências e relatório em commit documental posterior, consultável por `git log -3 --oneline`.

## Comandos e resultados

Executados no worktree indicado. Log resumido por comando; saídas integrais em `evidencias-web-1/` no diretório canônico deste relatório.

| Comando | Saída resumida | Conclusão |
|---|---|---|
| `yarn install --frozen-lockfile` | exit 0; Done in 7.15s | Dependências instaladas no worktree; yarn.lock inalterado. |
| `yarn vitest run src/features/inbox/components/contact-panel/spec023.test.tsx --maxWorkers=2` antes da implementação | exit 1; MuteButton inexistente | Red inicial de scaffolding, não prova comportamental. |
| `yarn vitest run src/features/inbox/services/clickup-inbox.clip.test.ts --maxWorkers=2` antes do reparo | 5 failed / 4 passed | Defeitos F9 reproduzidos antes da correção. |
| `yarn vitest run src/features/inbox/components/contact-panel/spec023.test.tsx src/features/inbox/services/conversation-actions.service.test.ts src/features/inbox/services/clickup-inbox.clip.test.ts --maxWorkers=2` | 3 passed / 38 passed | Funções novas e erros cobertos. |
| `yarn vitest run src/features/email/components/email-compose.spec023.test.tsx --maxWorkers=2 --reporter=verbose` | 1 passed | Gmail envia pelo serviço correto com conta/destinatário. |
| `yarn vitest run --maxWorkers=2` final | **71 arquivos passed / 374 testes passed**, 159,35 s | Suíte global verde. |
| `yarn tsc --noEmit` | exit 0; Done in 9.89s | Tipos limpos. |
| `yarn eslint` nos arquivos tocados (lista integral no log) | exit 0; **0 erros / 3 warnings preexistentes em chat-panel.tsx** | Nenhum erro novo; não é lint global sem avisos. Controle da base reproduz os mesmos warnings. |
| `git diff --check HEAD~2 HEAD` após os dois commits de produto | exit 0 | Diff sem problemas de whitespace. |
| Playwright, Vite local com adapter Axios sintético | document.scrollWidth=1440 e 390 nas respectivas viewports | Capturas locais; sem overflow horizontal da página. |

`verification-evidence.md` no worktree contém comandos, limites e controle dos avisos. Não houve alteração de timeout para produzir verde.

## Capturas

Componentes reais importados diretamente de src; dados sintéticos; CSS do app e data-brand A / dark. Não são captura da aplicação integrada nem aceite visual final.

| Função | Desktop 1440 px | Celular 390 px |
|---|---|---|
| F1 | [Silêncio](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f1-1440.png) | [Silêncio](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f1-390.png) |
| F4 | [Notas](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f4-1440.png) | [Notas](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f4-390.png) |
| F7 | [Jornada](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f7-1440.png) | [Jornada](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f7-390.png) |
| F8 | [Menu de canais](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f8-1440.png) | [Menu de canais](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f8-390.png) |
| F8 Gmail | [Compositor existente](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f8-gmail-1440.png) | [Compositor existente](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f8-gmail-390.png) |
| F9 | [Incorporação](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f9-1440.png) | [Incorporação](/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/capturas-web-1/f9-390.png) |

## Pendências e riscos

- O integrador deve ligar os três exports fixos no contact-workspace-panel.tsx, revisar os merges e executar QA independente. Testes locais não equivalem a aprovação da API ou produção.
- Contrato/proposta não possuem dado tipado disponível no projeto vinculado e foram omitidos conforme SPEC; registrado em perguntas-web-1.md e cross-requests.md. Não existe botão fictício para esses dados.
- F1 depende da API-1 para persistência e supressão de notificações. Não há disparador web de som/toast/Notification de mensagem encontrado na base atual.
- F8/F9 exercitados contra contratos/serviços mockados; não houve envio real por WhatsApp/Gmail/ClickUp nem prova de acesso interorganização no backend. Grupos e recusas por canal foram simulados conforme contrato.
- Três warnings de lint já existentes em chat-panel.tsx permanecem: duas tags img e uma dependência de useCallback fora das regiões desta mudança.
- Sem decisão estrutural pendente; nenhuma decisão foi inventada ou alegadamente roteada. Sem push, deploy, migração ou banco de produção. Arquivos .aiox permanecem fora dos commits.

## Próximo passo do integrador

`git -C /Users/luissbroggio/AIOX-enterprise/apps/bullq2/worktrees/web-spec023-1 log -3 --oneline`

Revisar os commits e ligar MuteButton, NotesSection e NegotiationJourney. Executar a mesma suíte após integração e smoke com API-1 real em ambiente autorizado. O setor não atribui aceite final ao aplicativo.

COMPANION_COMPLETE: companion-spec023-web-1-1
