/**
 * Bullq2 — Service Worker neutralizador (TD-W2-009)
 *
 * Histórico: navegadores de usuários antigos (especialmente Doc) tinham SW
 * cacheado de uma versão anterior do app (v1, ou plugin externo) que tentava
 * mandar telemetria pro Datadog RUM. Como o endpoint Datadog não existe mais,
 * o SW falhava com `Failed to fetch` em loop, poluindo o console em prod
 * (`sw.js:15`).
 *
 * Solução: publicar um SW vazio em `/sw.js` que se auto-desregistra na
 * primeira ativação. Qualquer browser que tente fetchar o SW antigo
 * (registrado por scope `/`) recebe este, que:
 *   1. Pula `skipWaiting` (não fica em "waiting")
 *   2. Em `activate`, deregistra-se + limpa todos os caches
 *   3. Recarrega clientes ativos pra remover qualquer hold no SW antigo
 *
 * Em ~24h os browsers reavaliam o SW (default max-age dos SW é 86400s),
 * todos os clientes acabam pegando este, e a poluição de console some.
 *
 * Quando bullq2 quiser um SW real (offline mode, push notifications), trocar
 * este arquivo pelo SW de verdade — o efeito de "desregistro" some
 * automaticamente porque o conteúdo muda.
 */

self.addEventListener('install', () => {
  // Não cacheia nada. Pula esperando ativação imediata.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Limpa todos os caches que possam ter sido criados por SW antigo.
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        /* ignore */
      }

      // 2. Desregistra-se a si mesmo. Browser deixará de ter SW ativo no scope.
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }

      // 3. Reload clientes ativos pra garantir que nenhum hold antigo persiste.
      const clientsList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientsList) {
        try {
          client.navigate(client.url);
        } catch {
          /* alguns browsers bloqueiam navigate via SW; tudo bem */
        }
      }
    })(),
  );
});

// Não interceptar fetches — passa direto pro browser default.
// (Não definir handler de 'fetch' é o mesmo que fall-through.)
