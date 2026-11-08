import { describe, expect, it, vi } from 'vitest';
import { clipAttachPlan, fanOutClipAttachment } from './clickup-inbox.service';

describe('AC-16b clip sem porta de dossiê', () => {
  it('plano: bound dispara ClickUp mesmo sem dossiê; unbound sem dossiê só toast', () => {
    expect(clipAttachPlan(true, false)).toEqual({
      callIncorporations: true,
      attachToDossier: false,
      toastNeedDossier: false,
    });
    expect(clipAttachPlan(false, false)).toEqual({
      callIncorporations: false,
      attachToDossier: false,
      toastNeedDossier: true,
    });
    expect(clipAttachPlan(true, true)).toEqual({
      callIncorporations: true,
      attachToDossier: true,
      toastNeedDossier: false,
    });
    expect(clipAttachPlan(false, true)).toEqual({
      callIncorporations: false,
      attachToDossier: true,
      toastNeedDossier: false,
    });
  });

  it('bound sem dossiê chama incorporations e não attachMessage', async () => {
    const incorporate = vi.fn(async () => ({ ok: true, kind: 'attachment', id: 'att-1' }));
    const attachMessage = vi.fn();
    const getProject = vi.fn(async () => ({ exists: false, id: null }));
    const out = await fanOutClipAttachment({
      cachedWorkbench: { status: 'task_vinculada', catalogShortcuts: [], canCreateLead: false },
      resolveWorkbench: vi.fn(),
      incorporate,
      getProject,
      attachMessage,
      messageId: 'msg-1',
    });
    expect(incorporate).toHaveBeenCalledWith({ kind: 'attachment', messageId: 'msg-1' });
    expect(attachMessage).not.toHaveBeenCalled();
    expect(out.needDossierToast).toBe(false);
    expect(out.calledIncorporations).toBe(true);
    expect(out.clickupError).toBeUndefined();
  });

  it('bound com dossiê chama incorporations e attachMessage', async () => {
    const incorporate = vi.fn(async () => ({ ok: true, kind: 'attachment', id: 'att-1' }));
    const attachMessage = vi.fn();
    const out = await fanOutClipAttachment({
      cachedWorkbench: { status: 'task_vinculada', catalogShortcuts: [], canCreateLead: false },
      resolveWorkbench: vi.fn(),
      incorporate,
      getProject: async () => ({ exists: true, id: 'proj-a' }),
      attachMessage,
      messageId: 'msg-1',
    });
    expect(incorporate).toHaveBeenCalledWith({ kind: 'attachment', messageId: 'msg-1' });
    expect(attachMessage).toHaveBeenCalledWith('proj-a', 'msg-1');
    expect(out.calledIncorporations).toBe(true);
    expect(out.attachedDossier).toBe(true);
  });

  it('unbound sem dossiê não chama ClickUp', async () => {
    const incorporate = vi.fn();
    const attachMessage = vi.fn();
    const out = await fanOutClipAttachment({
      cachedWorkbench: { status: 'sem_vinculo', catalogShortcuts: [], canCreateLead: false },
      resolveWorkbench: vi.fn(),
      incorporate,
      getProject: async () => ({ exists: false }),
      attachMessage,
      messageId: 'msg-1',
    });
    expect(incorporate).not.toHaveBeenCalled();
    expect(attachMessage).not.toHaveBeenCalled();
    expect(out.needDossierToast).toBe(true);
  });
});

describe('SPEC-023 F9', () => {
  it('incorpora texto como comentário e confirma sucesso mesmo sem dossiê', async () => {
    const incorporate = vi.fn(async () => ({ ok: true }));
    const out = await fanOutClipAttachment({
      cachedWorkbench: { status: 'task_vinculada', catalogShortcuts: [], canCreateLead: false },
      resolveWorkbench: vi.fn(), incorporate,
      getProject: async () => ({ exists: false }), attachMessage: vi.fn(), messageId: 'text-1', kind: 'comment',
    });
    expect(incorporate).toHaveBeenCalledWith({ kind: 'comment', messageId: 'text-1' });
    expect(out.incorporated).toBe(true);
  });
  it('erro ao buscar dossiê não bloqueia ClickUp', async () => {
    const incorporate = vi.fn(async () => ({ ok: true }));
    const out = await fanOutClipAttachment({
      cachedWorkbench: { status: 'task_vinculada', catalogShortcuts: [], canCreateLead: false },
      resolveWorkbench: vi.fn(), incorporate, getProject: async () => { throw new Error('Projeto inacessível'); },
      attachMessage: vi.fn(), messageId: 'm',
    });
    expect(incorporate).toHaveBeenCalled();
    expect(out.incorporated).toBe(true);
    expect(out.projectError).toBeInstanceOf(Error);
  });
  it.each(['Acesso negado', 'Canal sem acesso', 'Provedor indisponível'])('preserva erro de ClickUp: %s', async message => {
    const out = await fanOutClipAttachment({
      cachedWorkbench: null, resolveWorkbench: async () => { throw new Error(message); }, incorporate: vi.fn(),
      getProject: async () => ({ exists: false }), attachMessage: vi.fn(), messageId: 'm',
    });
    expect(out.clickupError).toEqual(new Error(message));
    expect(out.incorporated).toBe(false);
    expect(out.needDossierToast).toBe(false);
  });
});
