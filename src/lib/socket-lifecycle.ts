import type { Socket } from 'socket.io-client';

/**
 * Singleton socket handle. We track:
 * - the currently-joined conversation room (module scope) so we can rejoin
 *   it across reconnects;
 * - whether the backend has acknowledged auth (`ready` event). join:conversation
 *   emitted before `ready` is wasted — backend has no role/channelIds yet
 *   and silently rejects. We queue the join until `ready` fires.
 * - whether we've ever been ready before — a second `ready` event means
 *   we just reconnected (network blip, laptop wake) and consumers may
 *   want to refetch any data that could have changed while we were
 *   offline (messages, conversation list, …).
 */
let activeConversationId: string | null = null;
let authReady = false;
export const isSocketReady = () => authReady;
let everReady = false;

// Module-scope reconnect listeners. We call these whenever `ready` fires
// AFTER the first one — i.e. the user came back online. Each consumer
// hook subscribes once via `onReconnect`.
export const reconnectListeners = new Set<() => void>();

export function setActiveConversation(id: string | null) {
  activeConversationId = id;
}

export function getActiveConversation(): string | null {
  return activeConversationId;
}

const boundSockets = new WeakSet<Socket>();
const statusListeners = new Set<() => void>();
export const subscribeStatus = (fn: () => void) => { statusListeners.add(fn); return () => { statusListeners.delete(fn); }; };
const publishStatus = () => { for (const fn of statusListeners) fn(); };

export function bindLifecycle(socket: Socket) {
  if (boundSockets.has(socket)) return;
  boundSockets.add(socket);
  authReady = false;
  everReady = false;
  socket.on('connect', () => { authReady = false; publishStatus(); });
  socket.on('disconnect', () => { authReady = false; publishStatus(); });
  socket.on('ready', () => {
    if (authReady) return;
    const isReconnect = everReady;
    authReady = true;
    everReady = true;
    const id = getActiveConversation();
    if (id) socket.emit('join:conversation', { conversationId: id });
    publishStatus();
    if (isReconnect) for (const fn of reconnectListeners) {
      try { fn(); } catch { /* isolate subscribers */ }
    }
  });
}

