import { api } from '@/lib/api';

export type ClickUpMatchStatus =
  | 'unico'
  | 'ambiguo'
  | 'sem_card'
  | 'fora_do_padrao'
  | 'grupo';

export type ClickUpGroupStatus =
  | 'sem_dossie'
  | 'dossie_sem_task'
  | 'task_vinculada'
  | 'binding_invalido';

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

  async completeActivity(conversationId: string, taskId: string, activityId: string) {
    const { data } = await api.patch<{ data: { ok: boolean; status: string; card: ClickUpCard } }>(
      `${base(conversationId)}/tasks/${encodeURIComponent(taskId)}/activities/${encodeURIComponent(activityId)}/complete`,
    );
    return data.data;
  },
};

export function classifyClickUpError(err: unknown): 'not_configured' | 'upstream' | 'generic' {
  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code;
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
