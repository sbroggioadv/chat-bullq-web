import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { post },
  ApiClientError: class ApiClientError extends Error {},
}));

describe('createTask HTTP contract (F-03)', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { data: { ok: true, status: 'unico', card: { taskId: 't1' } } } });
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
  });

  it('POST {} com Idempotency-Key UUID e sem name/phone', async () => {
    const { clickupInboxService } = await import('./clickup-inbox.service');
    await clickupInboxService.createTask('conv-1');
    expect(post).toHaveBeenCalledTimes(1);
    const [path, body, config] = post.mock.calls[0];
    expect(path).toBe('/clickup-inbox/conversations/conv-1/tasks');
    expect(body).toEqual({});
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('phone');
    expect(config.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('aceita confirmSwitch no body quando pedido', async () => {
    const { clickupInboxService } = await import('./clickup-inbox.service');
    await clickupInboxService.createTask('conv-1', { confirmSwitch: true });
    expect(post.mock.calls[0][1]).toEqual({ confirmSwitch: true });
  });
});
