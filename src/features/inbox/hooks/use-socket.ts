'use client';

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

import { bindLifecycle, getActiveConversation, setActiveConversation, isSocketReady, reconnectListeners, subscribeStatus } from '@/lib/socket-lifecycle';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const connected = useSyncExternalStore(subscribeStatus, isSocketReady, () => false);
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    bindLifecycle(socket);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    const socket = socketRef.current;
    if (!socket) return;
    // Track join/leave to support auto-rejoin across reconnects.
    if (event === 'join:conversation') {
      setActiveConversation(data?.conversationId ?? null);
      // Defer the actual emit until backend signals `ready`. Without this,
      // a fresh tab opens the inbox, mounts ChatPanel, fires this emit
      // BEFORE handleConnection finishes the DB lookup, and the join is
      // silently dropped — leaving the user with stale chat panel.
      if (!isSocketReady()) return;
    }
    if (event === 'leave:conversation') {
      if (getActiveConversation() === data?.conversationId) {
        setActiveConversation(null);
      }
    }
    socket.emit(event, data);
  }, []);

  /**
   * Subscribe to "we just came back from a disconnect" — fires after
   * every `ready` except the very first one. Use it to refetch any data
   * that could have changed while we were offline (messages, conversation
   * list). Returns an unsubscribe function for cleanup in useEffect.
   */
  const onReconnect = useCallback((handler: () => void) => {
    reconnectListeners.add(handler);
    return () => {
      reconnectListeners.delete(handler);
    };
  }, []);

  return { on, emit, onReconnect, connected, socket: socketRef };
}
