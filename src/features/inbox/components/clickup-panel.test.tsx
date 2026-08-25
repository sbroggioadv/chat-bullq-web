import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClickUpPanel } from './clickup-panel';
import { ApiClientError } from '@/lib/api';
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
      searchWorkbenchTasks: vi.fn(),
      bindWorkbenchTask: vi.fn(),
      createWorkbenchTask: vi.fn(),
    },
  };
});

const mocked = clickupInboxService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
  getTask: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  resolveGroup: ReturnType<typeof vi.fn>;
  resolveWorkbench: ReturnType<typeof vi.fn>;
  searchWorkbenchTasks: ReturnType<typeof vi.fn>;
  bindWorkbenchTask: ReturnType<typeof vi.fn>;
  createWorkbenchTask: ReturnType<typeof vi.fn>;
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
    mocked.searchWorkbenchTasks.mockReset();
    mocked.bindWorkbenchTask.mockReset();
    mocked.createWorkbenchTask.mockReset();
    mocked.createTask.mockReset();
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
});
