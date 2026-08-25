import { api } from '@/lib/api';

export type ClickUpMatchStatus =
  | 'unico'
  | 'ambiguo'
  | 'sem_card'
  | 'fora_do_padrao'
  | 'grupo';

export type ClickUpGroupStatus =
  | 'sem_vinculo'
  | 'task_vinculada'
  | 'binding_invalido';

export type ClickUpWorkbenchStatus = 'sem_vinculo' | 'task_vinculada' | 'binding_invalido';

export type ClickUpCatalogShortcut = {
  id: string;
  label: string;
  kind: 'sales' | 'project';
};

export type ClickUpProjectList = {
  id: string;
  label: string;
};

export type ClickUpGroupProject = {
  id: string;
  name: string;
  clickupTaskId: string | null;
};

export type ClickUpFieldOption = {
  id: string;
  rotulo: string;
  cor: string | null;
};

export type ClickUpCampo = {
  id: string;
  nome: string;
  tipo: string;
  opcoes: ClickUpFieldOption[];
  moeda: string | null;
  valor: unknown;
  valorInput: unknown;
  writable: boolean;
};

export type ClickUpAtividade = {
  id: string;
  nome: string;
  status: string | null;
};

export type ClickUpComentario = {
  id: string;
  texto: string;
  quem: string | null;
  data: string | null;
};

export type ClickUpCard = {
  taskId: string;
  nome: string;
  etapa: string | null;
  etapas: string[];
  url: string | null;
  lista: string | null;
  listId: string;
  campos: ClickUpCampo[];
  atividades: ClickUpAtividade[];
  atividadesHabilitadas: boolean;
  comentarios: ClickUpComentario[];
};

export type ClickUpCandidato = {
  taskId: string;
  nome: string;
  status: string | null;
  lista: string | null;
};

export type ClickUpResolveResponse = {
  status: ClickUpMatchStatus;
  conversationId?: string;
  canonico?: string;
  motivo?: string;
  card?: ClickUpCard;
  candidatos?: ClickUpCandidato[];
};

export type ClickUpGroupResolveResponse = {
  status: ClickUpGroupStatus;
  conversationId?: string;
  project?: ClickUpGroupProject;
  projectLists?: ClickUpProjectList[];
  card?: ClickUpCard;
};

export type ClickUpPhoneShortcut = {
  status: ClickUpMatchStatus;
  canonico?: string;
  motivo?: string;
  card?: ClickUpCard;
  candidatos?: ClickUpCandidato[];
  primaryListLabel?: string | null;
};

export type ClickUpWorkbenchResponse = {
  status: ClickUpWorkbenchStatus;
  conversationId?: string;
  card?: ClickUpCard;
  phoneShortcut?: ClickUpPhoneShortcut;
  dossier?: ClickUpGroupProject | null;
  catalogShortcuts: ClickUpCatalogShortcut[];
  canCreateLead: boolean;
};

const base = (conversationId: string) =>
  `/clickup-inbox/conversations/${encodeURIComponent(conversationId)}`;

export const clickupInboxService = {
  async resolve(conversationId: string): Promise<ClickUpResolveResponse> {
    const { data } = await api.get<{ data: ClickUpResolveResponse }>(base(conversationId));
    return data.data;
  },

  async getTask(conversationId: string, taskId: string): Promise<ClickUpResolveResponse> {
    const { data } = await api.get<{ data: ClickUpResolveResponse }>(
      `${base(conversationId)}/tasks/${encodeURIComponent(taskId)}`,
    );
    return data.data;
  },

  async patchStatus(conversationId: string, taskId: string, status: string) {
    const { data } = await api.patch<{ data: { ok: boolean; etapa: string; card: ClickUpCard } }>(
      `${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/status`,
      { status },
    );
    return data.data;
  },

  async patchField(conversationId: string, taskId: string, fieldId: string, value: unknown) {
    const { data } = await api.patch<{ data: { ok: boolean; valor: unknown; card: ClickUpCard } }>(
      `${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/fields/${encodeURIComponent(fieldId)}`,
      { value },
    );
    return data.data;
  },

  async postComment(
    conversationId: string,
    taskId: string,
    body: { oQue: string; proximoPasso: string },
  ) {
    const { data } = await api.post<{
      data: { ok: boolean; comentarioId: string; comentarios: ClickUpComentario[] };
    }>(`${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/comments`, body);
    return data.data;
  },

  async postActivity(
    conversationId: string,
    taskId: string,
    body: { name: string; dueDate?: string },
  ) {
    const { data } = await api.post<{
      data: { ok: boolean; atividadeId: string; card: ClickUpCard };
    }>(`${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/activities`, body);
    return data.data;
  },

  async createTask(conversationId: string) {
    const { data } = await api.post<{
      data: { ok: boolean; status: ClickUpMatchStatus; card: ClickUpCard };
    }>(
      `${base(conversationId)}/tasks`,
      {},
      {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      },
    );
    return data.data;
  },

  async resolveGroup(conversationId: string): Promise<ClickUpGroupResolveResponse> {
    const { data } = await api.get<{ data: ClickUpGroupResolveResponse }>(
      `${base(conversationId)}/group`,
    );
    return data.data;
  },

  async searchGroupTasks(conversationId: string, q: string): Promise<{ candidatos: ClickUpCandidato[] }> {
    const { data } = await api.get<{ data: { candidatos: ClickUpCandidato[] } }>(
      `${base(conversationId)}/group/tasks/search`,
      { params: { q } },
    );
    return data.data;
  },

  async bindGroupTask(conversationId: string, taskRef: string) {
    const { data } = await api.post<{
      data: { ok: boolean; status: ClickUpGroupStatus; card: ClickUpCard };
    }>(`${base(conversationId)}/group/bind`, { taskRef });
    return data.data;
  },

  async createGroupTask(conversationId: string, body: { listId: string; name: string }) {
    const { data } = await api.post<{
      data: { ok: boolean; status: ClickUpGroupStatus; card: ClickUpCard };
    }>(`${base(conversationId)}/group/tasks`, body, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
    return data.data;
  },

  async resolveWorkbench(conversationId: string): Promise<ClickUpWorkbenchResponse> {
    const { data } = await api.get<{ data: ClickUpWorkbenchResponse }>(
      `${base(conversationId)}/workbench`,
    );
    return data.data;
  },

  async searchWorkbenchTasks(
    conversationId: string,
    q: string,
  ): Promise<{ candidatos: ClickUpCandidato[] }> {
    const { data } = await api.get<{ data: { candidatos: ClickUpCandidato[] } }>(
      `${base(conversationId)}/workbench/tasks/search`,
      { params: { q } },
    );
    return data.data;
  },

  async bindWorkbenchTask(
    conversationId: string,
    body: { taskRef: string; crossLinkDossier?: boolean; confirmSwitch?: boolean },
  ) {
    const { data } = await api.post<{
      data: { ok: boolean; status: ClickUpWorkbenchStatus; card: ClickUpCard };
    }>(`${base(conversationId)}/workbench/bind`, body, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
    return data.data;
  },

  async createWorkbenchTask(
    conversationId: string,
    body: { listId: string; name: string; crossLinkDossier?: boolean; confirmSwitch?: boolean },
  ) {
    const { data } = await api.post<{
      data: { ok: boolean; status: ClickUpWorkbenchStatus; card: ClickUpCard };
    }>(`${base(conversationId)}/workbench/tasks`, body, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
    return data.data;
  },

  async incorporateWorkbench(
    conversationId: string,
    body: { kind: 'comment' | 'attachment'; messageId?: string; documentId?: string },
  ) {
    const { data } = await api.post<{ data: unknown }>(
      `${base(conversationId)}/workbench/incorporations`,
      body,
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },

  async completeActivity(conversationId: string, taskId: string, activityId: string) {
    const { data } = await api.patch<{ data: { ok: boolean; status: string; card: ClickUpCard } }>(
      `${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/activities/${encodeURIComponent(activityId)}/complete`,
    );
    return data.data;
  },
};

export function classifyClickUpError(
  err: unknown,
): 'not_configured' | 'upstream' | 'generic' | 'switch_required' {
  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code;
  if (
    code === 'CLICKUP_ANCHOR_SWITCH_REQUIRED'
    || code === 'CLICKUP_ANCHOR_EXISTS'
  ) {
    return 'switch_required';
  }
  if (code === 'CLICKUP_NOT_CONFIGURED' || status === 503) return 'not_configured';
  if (
    code === 'CLICKUP_TIMEOUT'
    || code === 'CLICKUP_UPSTREAM'
    || status === 502
    || status === 504
  ) {
    return 'upstream';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/tempo limite|indisponível/i.test(msg)) return 'upstream';
  if (/não configurado|inacessível|não pertence ao team|malformado|campo WhatsApp|perfil/i.test(msg)) {
    return 'not_configured';
  }
  return 'generic';
}

export function clipAttachPlan(bound: boolean, projectExists: boolean) {
  return {
    callIncorporations: bound,
    attachToDossier: projectExists,
    toastNeedDossier: !bound && !projectExists,
  };
}

export async function fanOutClipAttachment(opts: {
  cachedWorkbench?: ClickUpWorkbenchResponse | null;
  resolveWorkbench: () => Promise<ClickUpWorkbenchResponse>;
  incorporate: (body: { kind: 'attachment'; messageId: string }) => Promise<unknown>;
  getProject: () => Promise<{ exists: boolean; id?: string | null }>;
  attachMessage: (projectId: string, messageId: string) => Promise<unknown>;
  messageId: string;
}): Promise<{
  calledIncorporations: boolean;
  attachedDossier: boolean;
  needDossierToast: boolean;
  clickupError?: unknown;
}> {
  let wb = opts.cachedWorkbench ?? null;
  if (!wb) {
    try {
      wb = await opts.resolveWorkbench();
    } catch {
      wb = null;
    }
  }
  const bound = wb?.status === 'task_vinculada';
  const project = await opts.getProject();
  const projectExists = Boolean(project.exists && project.id);
  const plan = clipAttachPlan(bound, projectExists);
  let clickupError: unknown;
  if (plan.callIncorporations) {
    try {
      await opts.incorporate({ kind: 'attachment', messageId: opts.messageId });
    } catch (err) {
      clickupError = err;
    }
  }
  if (plan.attachToDossier && project.id) {
    await opts.attachMessage(project.id, opts.messageId);
  }
  return {
    calledIncorporations: plan.callIncorporations,
    attachedDossier: plan.attachToDossier,
    needDossierToast: plan.toastNeedDossier,
    clickupError,
  };
}
