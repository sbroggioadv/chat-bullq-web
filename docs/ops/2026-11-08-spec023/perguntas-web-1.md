# Perguntas e limites — WEB-1

Sem decisão estrutural pendente. Nenhum pedido de decisão foi roteado pelo adapter.

- F7: não há contrato tipado de proposta/contrato no projeto vinculado (`Project` em `src/features/projects/services/projects.service.ts:37`; o painel de projeto ainda usa texto fixo em `project-detail.tsx`). Jornada usa somente cards, estágios e valores existentes. Contrato/proposta foram omitidos como permite a SPEC; se o integrador quiser exibi-los depois, API e produto precisam definir os campos reais.
- F9: a causa web é a seleção fixa de `kind: attachment` no clipe. `originFromMessage` aceita TEXT no enum mas exige URL para anexo; texto comum precisa de `kind: comment`. Corrigido e confirmado no pedido API-1 de `cross-requests.md`.
- F8: Gmail usa `EmailCompose` existente com `initialTo` opcional e conta obtida na troca; não usa `/messages`. Outros canais abrem a conversa retornada pelo endpoint `/open`. Rascunho do canal original permanece no mecanismo existente de persistência.
- F1: não foi encontrado disparador web de som/toast/Notification de mensagem recebida. Há apenas playback de áudio, solicitação de permissão e listagem de notificações. A API-1 informou que suprime `notification:new` e envia `suppressNotifications` em `message:new`; a web continua recebendo mensagens e contando não lidas.
- Integração/API ao vivo e QA independente pertencem ao integrador. Este setor não fez chamadas a provedor, banco, push ou deploy.

Pedidos intersetoriais estão no caminho canônico `/Users/luissbroggio/AIOX-enterprise/apps/bullq2/docs/ops/2026-11-08-spec023/cross-requests.md`.
