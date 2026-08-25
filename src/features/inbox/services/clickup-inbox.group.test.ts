import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get, post },
  ApiClientError: class ApiClientError extends Error {},
}));

describe('SPEC-008 group HTTP contract', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    post.mockResolvedValue({ data: { data: { ok: true, status: 'task_vinculada', card: { taskId: 't1' } } } });
    get.mockResolvedValue({ data: { data: { status: 'sem_vinculo', catalogShortcuts: [] } } });
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
  });

  it('resolveGroup, search, bind e create usam /group e Idempotency-Key', async () => {
    const { clickupInboxService } = await import('./clickup-inbox.service');
    await clickupInboxService.resolveGroup('conv-1');
    expect(get.mock.calls[0][0]).toBe('/clickup-inbox/conversations/conv-1/group');

    get.mockResolvedValue({ data: { data: { candidatos: [] } } });
    await clickupInboxService.searchGroupTasks('conv-1', 'Holding');
    expect(get.mock.calls[1][0]).toBe('/clickup-inbox/conversations/conv-1/group/tasks/search');
    expect(get.mock.calls[1][1]).toEqual({ params: { q: 'Holding' } });

    await clickupInboxService.bindGroupTask('conv-1', 'https://app.clickup.com/t/abc');
    expect(post.mock.calls[0][0]).toBe('/clickup-inbox/conversations/conv-1/group/bind');
    expect(post.mock.calls[0][1]).toEqual({ taskRef: 'https://app.clickup.com/t/abc' });

    await clickupInboxService.createGroupTask('conv-1', { listId: 'list-from-api', name: 'Dossiê' });
    const [pathName, body, config] = post.mock.calls[1];
    expect(pathName).toBe('/clickup-inbox/conversations/conv-1/group/tasks');
    expect(body).toEqual({ listId: 'list-from-api', name: 'Dossiê' });
    expect(config.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('SPEC-009 workbench HTTP', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    post.mockResolvedValue({ data: { data: { ok: true, status: 'task_vinculada', card: { taskId: 't1' } } } });
    get.mockResolvedValue({ data: { data: { status: 'sem_vinculo', catalogShortcuts: [] } } });
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
  });

  it('resolve/search/bind/create usam /workbench e Idempotency-Key', async () => {
    const { clickupInboxService } = await import('./clickup-inbox.service');
    await clickupInboxService.resolveWorkbench('conv-1');
    expect(get.mock.calls[0][0]).toBe('/clickup-inbox/conversations/conv-1/workbench');

    get.mockResolvedValue({ data: { data: { catalogShortcuts: [], spaces: [] } } });
    await clickupInboxService.getWorkbenchCatalog('conv-1');
    expect(get.mock.calls[1][0]).toBe('/clickup-inbox/conversations/conv-1/workbench/catalog');

    get.mockResolvedValue({ data: { data: { candidatos: [] } } });
    await clickupInboxService.searchWorkbenchTasks('conv-1', 'Holding');
    expect(get.mock.calls[2][0]).toBe('/clickup-inbox/conversations/conv-1/workbench/tasks/search');
    expect(get.mock.calls[2][1]).toEqual({ params: { q: 'Holding' } });

    await clickupInboxService.searchWorkbenchTasks('conv-1', 'Holding', 'space-projetos');
    expect(get.mock.calls[3][1]).toEqual({ params: { q: 'Holding', spaceId: 'space-projetos' } });

    await clickupInboxService.bindWorkbenchTask('conv-1', { taskRef: 'https://app.clickup.com/t/abc' });
    expect(post.mock.calls[0][0]).toBe('/clickup-inbox/conversations/conv-1/workbench/bind');
    expect(post.mock.calls[0][1]).toEqual({ taskRef: 'https://app.clickup.com/t/abc' });

    await clickupInboxService.incorporateWorkbench('conv-1', { kind: 'attachment', messageId: 'msg-1' });
    expect(post.mock.calls[1][0]).toBe('/clickup-inbox/conversations/conv-1/workbench/incorporations');
    expect(post.mock.calls[1][1]).toEqual({ kind: 'attachment', messageId: 'msg-1' });

    await clickupInboxService.createWorkbenchTask('conv-1', { listId: 'list-from-api', name: 'Task' });
    const [pathName, body, config] = post.mock.calls[2];
    expect(pathName).toBe('/clickup-inbox/conversations/conv-1/workbench/tasks');
    expect(body).toEqual({ listId: 'list-from-api', name: 'Task' });
    expect(config.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('AC-08/AC-15 frontend sem IDs reais', () => {
  it('inbox ClickUp não contém IDs do inventário nem Hoppe/Bravy/sinkra', () => {
    const inventory = readFileSync(
      path.resolve(process.cwd(), '../.aiox/orca/clickup-board-inventory.md'),
      'utf8',
    );
    const ids = [...new Set(inventory.match(/90171\d{6,}/g) ?? [])];
    const roots = [
      path.resolve(__dirname),
      path.resolve(__dirname, '../components/clickup-panel.tsx'),
      path.resolve(__dirname, '../components/contact-workspace-panel.tsx'),
    ];
    const files = roots.flatMap((p) => (statSync(p).isDirectory() ? walk(p) : [p]));
    const joined = files
      .filter((f) => !f.includes('.test.') && !f.includes('.spec.'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const id of ids) expect(joined).not.toContain(id);
    expect(joined).not.toMatch(/api\.clickup\.com/);
    expect(joined).not.toMatch(/hoppe/i);
    expect(joined).not.toMatch(/bravy/i);
    expect(joined).not.toMatch(/sinkra/i);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    if (!/\.(ts|tsx)$/.test(name)) return [];
    return [full];
  });
}
