import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClickUpPanel } from './clickup-panel';
import { ApiClientError } from '@/lib/api';
import { inboxService } from '../services/inbox.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  clickupInboxService,
  type ClickUpCard,
  type ClickUpWorkbenchResponse,
} from '../services/clickup-inbox.service';

vi.mock('../services/clickup-inbox.service', async () => {
  const actual = await vi.importActual<typeof import('../services/clickup-inbox.service')>(
    '../services/clickup-inbox.service',
  );
  return {
    ...actual,
    clickupInboxService: {
      resolve: vi.fn(),
      getTask: vi.fn(),
      patchStatus: vi.fn(),
      patchField: vi.fn(),
      postComment: vi.fn(),
      postActivity: vi.fn(),
      completeActivity: vi.fn(),
      createTask: vi.fn(),
      resolveGroup: vi.fn(),
      searchGroupTasks: vi.fn(),
      bindGroupTask: vi.fn(),
      createGroupTask: vi.fn(),
      resolveWorkbench: vi.fn(),
      getWorkbenchCatalog: vi.fn(),
      searchWorkbenchTasks: vi.fn(),
      bindWorkbenchTask: vi.fn(),
      createWorkbenchTask: vi.fn(),
      incorporateWorkbench: vi.fn(),
    },
  };
});

vi.mock('../services/inbox.service', async () => {
  const actual = await vi.importActual<typeof import('../services/inbox.service')>(
    '../services/inbox.service',
  );
  return {
    ...actual,
    inboxService: {
      ...actual.inboxService,
      getMessages: vi.fn(),
    },
  };
});

vi.mock('@/features/projects/services/projects.service', () => ({
  projectsService: {
    getByConversation: vi.fn(),
  },
}));

const mocked = clickupInboxService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
  getTask: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  resolveGroup: ReturnType<typeof vi.fn>;
  resolveWorkbench: ReturnType<typeof vi.fn>;
  getWorkbenchCatalog: ReturnType<typeof vi.fn>;
  searchWorkbenchTasks: ReturnType<typeof vi.fn>;
  bindWorkbenchTask: ReturnType<typeof vi.fn>;
  createWorkbenchTask: ReturnType<typeof vi.fn>;
  incorporateWorkbench: ReturnType<typeof vi.fn>;
};

function renderPanel(contactName = 'Maria', isGroup = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ClickUpPanel conversationId="conv-1" contactName={contactName} isGroup={isGroup} />
    </QueryClientProvider>,
  );
}

function card(overrides: Partial<ClickUpCard> = {}): ClickUpCard {
  return {
    taskId: 'task-1',
    nome: 'Maria Silva',
    etapa: 'novo',
    etapas: ['novo', 'andamento'],
    url: 'https://app.clickup.test/t/task-1',
    lista: 'Leads',
    listId: 'list-leads',
    campos: [
      {
        id: 'field-short',
        nome: 'Apelido',
        tipo: 'short_text',
        opcoes: [],
        moeda: null,
        valor: 'Maria',
        valorInput: 'Maria',
        writable: true,
      },
      {
        id: 'field-users',
        nome: 'Responsável',
        tipo: 'users',
        opcoes: [],
        moeda: null,
        valor: 'x',
        valorInput: 'x',
        writable: false,
      },
    ],
    atividades: [],
    atividadesHabilitadas: false,
    comentarios: [],
    ...overrides,
  };
}

const shortcuts = [
  { id: 'list-vendas', label: 'Processo de Vendas', kind: 'sales' as const },
  { id: 'list-holding', label: 'Holding', kind: 'project' as const },
  { id: 'list-consultivo', label: 'Consultivo', kind: 'project' as const },
  { id: 'list-iniciais', label: 'Iniciais Judiciais a Distribuir', kind: 'project' as const },
];

function wb(overrides: Partial<ClickUpWorkbenchResponse> = {}): ClickUpWorkbenchResponse {
  return {
    status: 'sem_vinculo',
    conversationId: 'conv-1',
    catalogShortcuts: shortcuts,
    canCreateLead: false,
    dossier: null,
    ...overrides,
  };
}

describe('SPEC-009 W0 ClickUpWorkbench', () => {
  beforeEach(() => {
    mocked.resolve.mockReset();
    mocked.resolveGroup.mockReset();
    mocked.resolveWorkbench.mockReset();
    mocked.getWorkbenchCatalog.mockReset();
    mocked.searchWorkbenchTasks.mockReset();
    mocked.bindWorkbenchTask.mockReset();
    mocked.createWorkbenchTask.mockReset();
    mocked.createTask.mockReset();
    mocked.incorporateWorkbench.mockReset();
    mocked.getWorkbenchCatalog.mockResolvedValue({ catalogShortcuts: shortcuts, spaces: [] });
    vi.mocked(inboxService.getMessages).mockResolvedValue({ messages: [], pagination: {} });
    vi.mocked(projectsService.getByConversation).mockResolvedValue({
      exists: false,
      id: null,
      name: '',
      description: null,
      groupJid: null,
      hoppeId: null,
      responsibleUserId: null,
      responsible: null,
      status: null,
      metadata: {},
      conversationIds: [],
      tasks: [],
      attachments: [],
      contacts: [],
    });
  });

  it('AC-01 grupo sem dossiê e 1:1 sem telefone mostram Vincular/Criar e nenhum sem_dossie', async () => {
    mocked.resolveWorkbench.mockResolvedValue(wb());
    renderPanel('Grupo Holding', true);
    expect(await screen.findByTestId('clickup-workbench')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-state-sem-vinculo')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-criar')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-state-sem-dossie')).not.toBeInTheDocument();
    expect(screen.queryByText(/aba Projeto/i)).not.toBeInTheDocument();
    expect(mocked.resolveWorkbench).toHaveBeenCalledWith('conv-1');
    expect(mocked.resolve).not.toHaveBeenCalled();
    expect(mocked.resolveGroup).not.toHaveBeenCalled();

    cleanup();
    mocked.resolveWorkbench.mockClear();
    renderPanel('', false);
    expect(await screen.findByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-state-sem-dossie')).not.toBeInTheDocument();
  });

  it('AC-02 grupo não dispara resolve telefônico (só workbench)', async () => {
    mocked.resolveWorkbench.mockResolvedValue(wb());
    renderPanel('Grupo', true);
    await screen.findByTestId('clickup-workbench');
    expect(mocked.resolve).not.toHaveBeenCalled();
    expect(mocked.resolveGroup).not.toHaveBeenCalled();
  });

  it('AC-03/AC-04 1:1 com 0, 1 e N matches mantém Vincular/Criar; único não muta sozinho', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        canCreateLead: true,
        phoneShortcut: { status: 'sem_card', primaryListLabel: 'Processo de Vendas' },
      }),
    );
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-phone-shortcut')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-criar')).toBeInTheDocument();
    expect(mocked.bindWorkbenchTask).not.toHaveBeenCalled();

    cleanup();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        phoneShortcut: { status: 'unico', card: card() },
      }),
    );
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-usar-nesta-conversa')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-vincular')).toBeInTheDocument();
    expect(mocked.bindWorkbenchTask).not.toHaveBeenCalled();
    mocked.bindWorkbenchTask.mockResolvedValue({ ok: true, status: 'task_vinculada', card: card() });
    await user.click(screen.getByTestId('clickup-usar-nesta-conversa'));
    expect(mocked.bindWorkbenchTask).toHaveBeenCalledWith('conv-1', { taskRef: 'task-1' });

    cleanup();
    mocked.bindWorkbenchTask.mockClear();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        phoneShortcut: {
          status: 'ambiguo',
          candidatos: [
            { taskId: 'a1', nome: 'A', status: 'novo', lista: 'Leads' },
            { taskId: 'b2', nome: 'B', status: 'novo', lista: 'Leads' },
          ],
        },
      }),
    );
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-state-ambiguo')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('b2')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-usar-nesta-conversa')).not.toBeInTheDocument();
    expect(mocked.bindWorkbenchTask).not.toHaveBeenCalled();
  });

  it('AC-05 dossiê aparece como chip e não esconde as ações', async () => {
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        dossier: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null },
      }),
    );
    renderPanel('Grupo', true);
    expect(await screen.findByTestId('clickup-dossier-chip')).toHaveTextContent('Holding Silva');
    expect(screen.getByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-criar')).toBeInTheDocument();
  });

  it('AC-11 busca mostra N candidatos e só vincula no clique', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb());
    mocked.searchWorkbenchTasks.mockResolvedValue({
      candidatos: [
        { taskId: 'h1', nome: 'Holding Alfa', status: 'novo', lista: 'Holding' },
        { taskId: 'h2', nome: 'Holding Beta', status: 'novo', lista: 'Holding' },
      ],
    });
    mocked.bindWorkbenchTask.mockResolvedValue({
      ok: true,
      status: 'task_vinculada',
      card: card({ taskId: 'h1', nome: 'Holding Alfa' }),
    });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-vincular'));
    await user.type(screen.getByPlaceholderText(/cole a url/i), 'Holding');
    await user.click(screen.getByTestId('clickup-workbench-search'));
    expect(await screen.findByTestId('clickup-workbench-candidatos')).toBeInTheDocument();
    expect(screen.getByText('h1')).toBeInTheDocument();
    expect(screen.getByText('h2')).toBeInTheDocument();
    expect(mocked.bindWorkbenchTask).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Holding Alfa/ }));
    expect(mocked.bindWorkbenchTask).toHaveBeenCalledWith('conv-1', { taskRef: 'h1' });
    expect(await screen.findByTestId('clickup-state-task-vinculada')).toBeInTheDocument();
  });

  it('AC-12 seletor de criar usa atalhos e não POSTa nome vazio', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb());
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    const select = await screen.findByTestId('clickup-create-list');
    expect(screen.getByTestId('clickup-workbench-list')).toBeInTheDocument();
    expect(select).toHaveTextContent('Holding');
    expect(select).toHaveTextContent('Consultivo');
    expect(select).toHaveTextContent('Iniciais Judiciais a Distribuir');
    expect(select).toHaveTextContent('Processo de Vendas');
    expect(screen.getByTestId('clickup-workbench-create-submit')).toBeDisabled();
    expect(mocked.createWorkbenchTask).not.toHaveBeenCalled();
  });

  it('AC-12b task vinculada continua mostrando Vincular/Criar', async () => {
    mocked.resolveWorkbench.mockResolvedValue(
      wb({ status: 'task_vinculada', card: card() }),
    );
    renderPanel('Grupo', true);
    expect(await screen.findByTestId('clickup-state-task-vinculada')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-mutations')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-criar')).toBeInTheDocument();
  });

  it('F-03 atalho telefônico é somente leitura com âncora; Vincular/Criar permanecem', async () => {
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        status: 'task_vinculada',
        card: card(),
        canCreateLead: true,
        phoneShortcut: { status: 'unico', card: card({ taskId: 'task-sales' }), primaryListLabel: 'Processo de Vendas' },
      }),
    );
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-phone-shortcut')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-usar-nesta-conversa')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clickup-create')).not.toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-vincular')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(mocked.bindWorkbenchTask).not.toHaveBeenCalled();
    expect(mocked.createTask).not.toHaveBeenCalled();
    expect(mocked.createWorkbenchTask).not.toHaveBeenCalled();

    cleanup();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({
        status: 'task_vinculada',
        card: card(),
        canCreateLead: true,
        phoneShortcut: { status: 'sem_card', primaryListLabel: 'Processo de Vendas' },
      }),
    );
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-phone-shortcut')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-create')).not.toBeInTheDocument();
    expect(screen.getByTestId('clickup-workbench-criar')).toBeInTheDocument();
    expect(mocked.createTask).not.toHaveBeenCalled();
  });

  it('AC-12b diálogo confirm-switch: cancelar zero POST extra; confirmar reenvia', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb({ status: 'task_vinculada', card: card() }));
    const conflict = new ApiClientError(
      'esta conversa já tem uma task vinculada',
      409,
      'CLICKUP_ANCHOR_SWITCH_REQUIRED',
    );
    mocked.createWorkbenchTask.mockRejectedValueOnce(conflict);
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-iniciais');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(await screen.findByTestId('clickup-confirm-switch')).toBeInTheDocument();
    expect(mocked.createWorkbenchTask).toHaveBeenCalledTimes(1);
    expect(mocked.createWorkbenchTask.mock.calls[0][1].confirmSwitch).toBeUndefined();

    await user.click(screen.getByTestId('clickup-confirm-switch-cancel'));
    expect(screen.queryByTestId('clickup-confirm-switch')).not.toBeInTheDocument();
    expect(mocked.createWorkbenchTask).toHaveBeenCalledTimes(1);

    mocked.createWorkbenchTask.mockRejectedValueOnce(conflict);
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(await screen.findByTestId('clickup-confirm-switch')).toBeInTheDocument();
    mocked.createWorkbenchTask.mockResolvedValueOnce({
      ok: true,
      status: 'task_vinculada',
      card: card({ taskId: 'task-inicial' }),
    });
    await user.click(screen.getByTestId('clickup-confirm-switch-confirm'));
    expect(mocked.createWorkbenchTask).toHaveBeenCalledTimes(3);
    expect(mocked.createWorkbenchTask.mock.calls[2][1]).toEqual(
      expect.objectContaining({ listId: 'list-iniciais', confirmSwitch: true }),
    );
  });

  it('503 integração não configurada', async () => {
    mocked.resolveWorkbench.mockRejectedValue(new Error('ClickUp não configurado'));
    renderPanel();
    expect(await screen.findByTestId('clickup-state-not-configured')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });

  it('upstream indisponível', async () => {
    mocked.resolveWorkbench.mockRejectedValue(new Error('ClickUp indisponível'));
    renderPanel();
    expect(await screen.findByTestId('clickup-state-upstream')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });

  const liveCatalog = {
    catalogShortcuts: shortcuts,
    spaces: [
      {
        id: 'space-comercial',
        label: 'Comercial',
        folders: [],
        lists: [{ id: 'list-consultivo-comercial', label: 'Consultivo' }],
      },
      {
        id: 'space-projetos',
        label: 'Projetos',
        folders: [
          {
            id: 'folder-iniciais',
            label: 'Iniciais',
            lists: [{ id: 'list-iniciais-live', label: 'Iniciais a Confeccionar' }],
          },
        ],
        lists: [
          { id: 'list-holding-live', label: 'Holding' },
          { id: 'list-consultivo-projetos', label: 'Consultivo' },
        ],
      },
    ],
  };

  it('AC-06 picker em árvore com homônimos; nada pré-selecionado pela ordem', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb());
    mocked.getWorkbenchCatalog.mockResolvedValue(liveCatalog);
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    const select = await screen.findByTestId('clickup-create-list');
    expect(select).toHaveValue('');
    expect(screen.getByTestId('clickup-catalog-shortcuts')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-catalog-space-space-comercial')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-catalog-space-space-projetos')).toBeInTheDocument();
    expect(select).toHaveTextContent('Iniciais / Iniciais a Confeccionar');
    const consultivo = [...select.querySelectorAll('option')].filter((opt) => opt.textContent === 'Consultivo');
    expect(consultivo.length).toBeGreaterThanOrEqual(2);
    expect(mocked.createWorkbenchTask).not.toHaveBeenCalled();
  });

  it('AC-07 labels dos exemplos são escolhíveis sem mapa de IDs no frontend', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb());
    mocked.getWorkbenchCatalog.mockResolvedValue(liveCatalog);
    mocked.createWorkbenchTask.mockResolvedValue({
      ok: true,
      status: 'task_vinculada',
      card: card({ taskId: 'task-inicial' }),
    });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    const select = await screen.findByTestId('clickup-create-list');
    expect(select).toHaveTextContent('Consultivo');
    expect(select).toHaveTextContent('Holding');
    expect(select).toHaveTextContent('Processo de Vendas');
    expect(select).toHaveTextContent('Iniciais Judiciais a Distribuir');
    expect(select).toHaveTextContent('Iniciais a Confeccionar');
    await user.selectOptions(select, 'list-iniciais-live');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(mocked.createWorkbenchTask).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ listId: 'list-iniciais-live' }),
    );
  });

  it('AC-15 checkbox cruzar dossiê: default true se vazio, false se divergente', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({ dossier: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null } }),
    );
    mocked.createWorkbenchTask.mockResolvedValue({
      ok: true,
      status: 'task_vinculada',
      card: card({ taskId: 'task-new' }),
    });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    const box = await screen.findByTestId('clickup-cross-link-dossier');
    expect(box.querySelector('input')).toBeChecked();
    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-holding');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(mocked.createWorkbenchTask).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ listId: 'list-holding', crossLinkDossier: true }),
    );

    cleanup();
    mocked.createWorkbenchTask.mockClear();
    mocked.resolveWorkbench.mockResolvedValue(
      wb({ dossier: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: 'task-old' } }),
    );
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    const divergent = await screen.findByTestId('clickup-cross-link-dossier');
    expect(divergent.querySelector('input')).not.toBeChecked();
    expect(screen.queryByTestId('clickup-cross-link-overwrite')).not.toBeInTheDocument();
    await user.click(divergent.querySelector('input')!);
    expect(screen.getByTestId('clickup-cross-link-overwrite')).toBeInTheDocument();
    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-holding');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(mocked.createWorkbenchTask).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ crossLinkDossier: true }),
    );
  });

  it('AC-15 sem dossiê não envia crossLinkDossier', async () => {
    const user = userEvent.setup();
    mocked.resolveWorkbench.mockResolvedValue(wb());
    mocked.createWorkbenchTask.mockResolvedValue({
      ok: true,
      status: 'task_vinculada',
      card: card(),
    });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    expect(screen.queryByTestId('clickup-cross-link-dossier')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-holding');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(mocked.createWorkbenchTask.mock.calls[0][1].crossLinkDossier).toBeUndefined();
  });

  it('AC-15 F-01 create A depois confirma troca para B não reenvia crossLinkDossier true', async () => {
    const user = userEvent.setup();
    const conflict = new ApiClientError(
      'esta conversa já tem uma task vinculada',
      409,
      'CLICKUP_ANCHOR_SWITCH_REQUIRED',
    );
    mocked.resolveWorkbench.mockResolvedValue(
      wb({ dossier: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null } }),
    );
    mocked.createWorkbenchTask
      .mockResolvedValueOnce({
        ok: true,
        status: 'task_vinculada',
        card: card({ taskId: 'task-a' }),
      })
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({
        ok: true,
        status: 'task_vinculada',
        card: card({ taskId: 'task-b' }),
      });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-criar'));
    expect((await screen.findByTestId('clickup-cross-link-dossier')).querySelector('input')).toBeChecked();
    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-holding');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(mocked.createWorkbenchTask.mock.calls[0][1]).toEqual(
      expect.objectContaining({ listId: 'list-holding', crossLinkDossier: true }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('clickup-cross-link-dossier').querySelector('input')).not.toBeChecked();
    });
    expect(screen.queryByTestId('clickup-cross-link-overwrite')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('clickup-create-list'), 'list-iniciais');
    await user.click(screen.getByTestId('clickup-workbench-create-submit'));
    expect(await screen.findByTestId('clickup-confirm-switch')).toBeInTheDocument();
    expect(mocked.createWorkbenchTask.mock.calls[1][1].confirmSwitch).toBeUndefined();
    expect(mocked.createWorkbenchTask.mock.calls[1][1].crossLinkDossier).not.toBe(true);
    expect(screen.queryByTestId('clickup-cross-link-overwrite')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('clickup-confirm-switch-confirm'));
    expect(mocked.createWorkbenchTask).toHaveBeenCalledTimes(3);
    expect(mocked.createWorkbenchTask.mock.calls[2][1]).toEqual(
      expect.objectContaining({ listId: 'list-iniciais', confirmSwitch: true }),
    );
    expect(mocked.createWorkbenchTask.mock.calls[2][1].crossLinkDossier).not.toBe(true);
  });

  it('AC-15 F-01 bind A depois confirma troca para B não reenvia crossLinkDossier true', async () => {
    const user = userEvent.setup();
    const conflict = new ApiClientError(
      'esta conversa já tem uma task vinculada',
      409,
      'CLICKUP_ANCHOR_SWITCH_REQUIRED',
    );
    mocked.resolveWorkbench.mockResolvedValue(
      wb({ dossier: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null } }),
    );
    mocked.bindWorkbenchTask
      .mockResolvedValueOnce({
        ok: true,
        status: 'task_vinculada',
        card: card({ taskId: 'task-a' }),
      })
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({
        ok: true,
        status: 'task_vinculada',
        card: card({ taskId: 'task-b' }),
      });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-workbench-vincular'));
    expect((await screen.findByTestId('clickup-cross-link-dossier')).querySelector('input')).toBeChecked();
    await user.type(screen.getByPlaceholderText(/cole a url/i), 'task-a');
    await user.click(screen.getByTestId('clickup-workbench-bind-paste'));
    expect(mocked.bindWorkbenchTask.mock.calls[0][1]).toEqual(
      expect.objectContaining({ taskRef: 'task-a', crossLinkDossier: true }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('clickup-cross-link-dossier').querySelector('input')).not.toBeChecked();
    });
    expect(screen.queryByTestId('clickup-cross-link-overwrite')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText(/cole a url/i);
    await user.clear(input);
    await user.type(input, 'task-b');
    await user.click(screen.getByTestId('clickup-workbench-bind-paste'));
    expect(await screen.findByTestId('clickup-confirm-switch')).toBeInTheDocument();
    expect(mocked.bindWorkbenchTask.mock.calls[1][1].confirmSwitch).toBeUndefined();
    expect(mocked.bindWorkbenchTask.mock.calls[1][1].crossLinkDossier).not.toBe(true);
    expect(screen.queryByTestId('clickup-cross-link-overwrite')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('clickup-confirm-switch-confirm'));
    expect(mocked.bindWorkbenchTask).toHaveBeenCalledTimes(3);
    expect(mocked.bindWorkbenchTask.mock.calls[2][1]).toEqual(
      expect.objectContaining({ taskRef: 'task-b', confirmSwitch: true }),
    );
    expect(mocked.bindWorkbenchTask.mock.calls[2][1].crossLinkDossier).not.toBe(true);
  });

  it('AC-16 comment e attachment são dois POSTs; um botão não envia os dois kinds', async () => {
    const user = userEvent.setup();
    vi.mocked(inboxService.getMessages).mockResolvedValue({
      messages: [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          direction: 'INBOUND',
          type: 'TEXT',
          content: { text: 'contrato assinado' },
          externalId: null,
          status: 'DELIVERED',
          senderName: 'Maria',
          senderId: null,
          sender: null,
          sentAt: null,
          deliveredAt: null,
          readAt: null,
          createdAt: '2026-08-25T21:00:00.000Z',
        },
      ],
      pagination: {},
    });
    mocked.resolveWorkbench.mockResolvedValue(wb({ status: 'task_vinculada', card: card() }));
    mocked.incorporateWorkbench.mockResolvedValue({ ok: true, kind: 'comment', id: 'cmt-1' });
    renderPanel('Grupo', true);
    expect(await screen.findByTestId('clickup-incorporate')).toBeInTheDocument();
    await user.click(await screen.findByTestId('clickup-incorporate-comment-msg-1'));
    expect(mocked.incorporateWorkbench).toHaveBeenCalledWith('conv-1', {
      kind: 'comment',
      messageId: 'msg-1',
    });
    mocked.incorporateWorkbench.mockResolvedValue({ ok: true, kind: 'attachment', id: 'att-1' });
    await user.click(screen.getByTestId('clickup-incorporate-file-msg-1'));
    expect(mocked.incorporateWorkbench).toHaveBeenCalledTimes(2);
    expect(mocked.incorporateWorkbench.mock.calls[1][1]).toEqual({
      kind: 'attachment',
      messageId: 'msg-1',
    });
    expect(mocked.incorporateWorkbench.mock.calls.some((c) => c[1].kind === 'comment' && c[1].documentId)).toBe(
      false,
    );
  });
});
