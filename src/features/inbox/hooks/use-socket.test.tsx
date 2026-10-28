import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useSocket } from '@/features/inbox/hooks/use-socket';
const fake = vi.hoisted(() => ({ handlers: new Map<string, Set<() => void>>(), emit: vi.fn() }));
vi.mock('@/lib/socket', () => {
  const socket = { connected: true, emit: fake.emit, on: (event: string, fn: () => void) => { if (!fake.handlers.has(event)) fake.handlers.set(event, new Set()); fake.handlers.get(event)!.add(fn); }, off: (event: string, fn: () => void) => fake.handlers.get(event)?.delete(fn) };
  return { getSocket: () => socket };
});
afterEach(cleanup);
it('3 consumidores têm um ready, um join e um callback de recuperação cada', () => {
  const callbacks = [vi.fn(), vi.fn(), vi.fn()];
  const hooks = callbacks.map((fn) => renderHook(() => {
    const socket = useSocket();
    useEffect(() => socket.onReconnect(fn), [socket.onReconnect]);
    return socket;
  }));
  expect(fake.handlers.get('ready')?.size).toBe(1);
  act(() => hooks[0].result.current.emit('join:conversation', { conversationId: 'fixture' }));
  act(() => { for (const fn of fake.handlers.get('ready')!) fn(); });
  expect(callbacks.map((fn) => fn.mock.calls.length)).toEqual([0, 0, 0]);
  expect(fake.emit).toHaveBeenCalledTimes(1);
  act(() => { for (const fn of fake.handlers.get('disconnect')!) fn(); for (const fn of fake.handlers.get('connect')!) fn(); for (const fn of fake.handlers.get('ready')!) fn(); });
  expect(callbacks.map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  expect(fake.emit).toHaveBeenCalledTimes(2);
  expect(hooks.every((hook) => hook.result.current.connected)).toBe(true);
});
