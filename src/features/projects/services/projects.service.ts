import { api } from '@/lib/api';

export interface ProjectResponsible {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectAttachment {
  id: string;
  label: string;
  fileName: string;
  url: string | null;
  preview: string | null;
  messageId: string | null;
  createdAt: string;
}

export interface ProjectContact {
  id: string;
  contactId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

/** Dossiê (holding / caso / grupo específico) — não é o grupo de WhatsApp. */
export interface Project {
  id: string | null;
  name: string;
  description: string | null;
  groupJid: string | null;
  hoppeId: string | null;
  responsibleUserId: string | null;
  responsible: ProjectResponsible | null;
  status: string | null;
  metadata: Record<string, unknown>;
  exists: boolean;
  conversationIds: string[];
  tasks: ProjectTask[];
  attachments: ProjectAttachment[];
  contacts: ProjectContact[];
}

export type ProjectSummary = Project;
export type ProjectListRow = Project;

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: string;
  conversationId?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  hoppeId?: string;
  responsibleUserId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export const projectsService = {
  async create(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await api.post<{ data: Project }>('/projects', payload);
    return data.data;
  },

  async list(params?: {
    hoppeId?: string;
    responsibleUserId?: string;
    status?: string;
    search?: string;
  }): Promise<ProjectListRow[]> {
    const { data } = await api.get<{ data: ProjectListRow[] }>('/projects', {
      params,
    });
    return data.data;
  },

  async filters(): Promise<{ hoppeIds: string[]; statuses: string[] }> {
    const { data } = await api.get<{
      data: { hoppeIds: string[]; statuses: string[] };
    }>('/projects/filters');
    return data.data;
  },

  async getById(id: string): Promise<Project> {
    const { data } = await api.get<{ data: Project }>(`/projects/${id}`);
    return data.data;
  },

  async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const { data } = await api.put<{ data: Project }>(`/projects/${id}`, payload);
    return data.data;
  },

  async getByConversation(conversationId: string): Promise<Project> {
    const { data } = await api.get<{ data: Project }>(
      `/projects/by-conversation/${conversationId}`,
    );
    return data.data;
  },

  async updateByConversation(
    conversationId: string,
    payload: UpdateProjectPayload,
  ): Promise<Project> {
    const { data } = await api.put<{ data: Project }>(
      `/projects/by-conversation/${conversationId}`,
      payload,
    );
    return data.data;
  },

  async linkConversation(
    projectId: string,
    conversationId: string,
  ): Promise<Project> {
    const { data } = await api.post<{ data: Project }>(
      `/projects/${projectId}/conversations`,
      { conversationId },
    );
    return data.data;
  },

  async addTask(projectId: string, title: string): Promise<Project> {
    const { data } = await api.post<{ data: Project }>(
      `/projects/${projectId}/tasks`,
      { title },
    );
    return data.data;
  },

  async updateTask(
    projectId: string,
    taskId: string,
    payload: { title?: string; done?: boolean },
  ): Promise<Project> {
    const { data } = await api.patch<{ data: Project }>(
      `/projects/${projectId}/tasks/${taskId}`,
      payload,
    );
    return data.data;
  },

  async removeTask(projectId: string, taskId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
  },

  async attachMessage(projectId: string, messageId: string): Promise<Project> {
    const { data } = await api.post<{ data: Project }>(
      `/projects/${projectId}/attachments`,
      { messageId },
    );
    return data.data;
  },

  async removeAttachment(
    projectId: string,
    attachmentId: string,
  ): Promise<void> {
    await api.delete(`/projects/${projectId}/attachments/${attachmentId}`);
  },

  async addContact(projectId: string, contactId: string): Promise<Project> {
    const { data } = await api.post<{ data: Project }>(
      `/projects/${projectId}/contacts`,
      { contactId },
    );
    return data.data;
  },

  async removeContact(projectId: string, linkId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/contacts/${linkId}`);
  },

  async emailParticipants(
    projectId: string,
    payload: { subject: string; body: string; to?: string },
  ): Promise<void> {
    await api.post(`/projects/${projectId}/email`, payload);
  },
};
