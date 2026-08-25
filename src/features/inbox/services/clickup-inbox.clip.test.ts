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
    const incorporate = vi.fn(async () => {
      const err = Object.assign(new Error('incorporar fica na próxima wave'), {
        status: 501,
        code: 'CLICKUP_INCORPORATE_NOT_READY',
      });
      throw err;
    });
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
    expect(out.clickupError).toBeTruthy();
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
