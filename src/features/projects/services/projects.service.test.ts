import { expect, it, vi } from 'vitest';
import { projectsService } from './projects.service';

const mocks = vi.hoisted(() => ({ delete: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { delete: mocks.delete } }));

it('retorna o projeto e a quantidade de conversas removidas', async () => {
  mocks.delete.mockResolvedValue({ data: { data: { projectId: 'p1', removedConversations: 2 } } });
  await expect(projectsService.removeByConversation('c1')).resolves.toEqual({ projectId: 'p1', removedConversations: 2 });
  expect(mocks.delete).toHaveBeenCalledWith('/projects/by-conversation/c1');
});
