import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClickUpPanel } from './clickup-panel';
import {
  clickupInboxService,
  type ClickUpCard,
  type ClickUpResolveResponse,
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
    },
  };
});

const mocked = clickupInboxService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
  getTask: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  resolveGroup: ReturnType<typeof vi.fn>;
  searchGroupTasks: ReturnType<typeof vi.fn>;
  bindGroupTask: ReturnType<typeof vi.fn>;
  createGroupTask: ReturnType<typeof vi.fn>;
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

describe('AC-04 estados do painel ClickUp', () => {
  beforeEach(() => {
    mocked.resolve.mockReset();
    mocked.getTask.mockReset();
    mocked.resolveGroup.mockReset();
    mocked.searchGroupTasks.mockReset();
    mocked.bindGroupTask.mockReset();
    mocked.createGroupTask.mockReset();
  });

  it('AC-01 1:1 não chama resolveGroup; grupo não chama resolve', async () => {
    mocked.resolve.mockResolvedValue({ status: 'sem_card' });
    mocked.resolveGroup.mockResolvedValue({ status: 'sem_dossie' });
    renderPanel('Maria', false);
    expect(await screen.findByTestId('clickup-state-sem-card')).toBeInTheDocument();
    expect(mocked.resolve).toHaveBeenCalledWith('conv-1');
    expect(mocked.resolveGroup).not.toHaveBeenCalled();

    mocked.resolve.mockClear();
    mocked.resolveGroup.mockClear();
    renderPanel('Maria', true);
    expect(await screen.findByTestId('clickup-state-sem-dossie')).toBeInTheDocument();
    expect(mocked.resolveGroup).toHaveBeenCalledWith('conv-1');
    expect(mocked.resolve).not.toHaveBeenCalled();
  });

  it('grupo legado 1:1 ainda mostra o aviso de telefone', async () => {
    mocked.resolve.mockResolvedValue({ status: 'grupo' } satisfies ClickUpResolveResponse);
    renderPanel();
    expect(await screen.findByTestId('clickup-state-grupo')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });

  it('fora do padrão', async () => {
    mocked.resolve.mockResolvedValue({ status: 'fora_do_padrao', motivo: 'nao_br' });
    renderPanel();
    expect(await screen.findByTestId('clickup-state-fora')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });

  it('zero cards', async () => {
    mocked.resolve.mockResolvedValue({ status: 'sem_card' });
    renderPanel();
    expect(await screen.findByTestId('clickup-state-sem-card')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
    expect(screen.getByTestId('clickup-create')).toBeEnabled();
  });

  it('sem_card sem nome bloqueia criar', async () => {
    mocked.resolve.mockResolvedValue({ status: 'sem_card' });
    renderPanel('');
    expect(await screen.findByTestId('clickup-create')).toBeDisabled();
    expect(screen.getByTestId('clickup-create-needs-name')).toBeInTheDocument();
  });

  it('clique em criar envia só conversationId e mostra o card após sucesso', async () => {
    const user = userEvent.setup();
    mocked.resolve.mockResolvedValue({ status: 'sem_card' });
    mocked.createTask.mockResolvedValue({ ok: true, status: 'unico', card: card() });
    renderPanel('Maria');
    await user.click(await screen.findByTestId('clickup-create'));
    expect(mocked.createTask).toHaveBeenCalledWith('conv-1');
    expect(mocked.createTask.mock.calls[0]).toHaveLength(1);
    expect(await screen.findByTestId('clickup-state-unico')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('N candidatos exige clique e não escolhe sozinho', async () => {
    const user = userEvent.setup();
    mocked.resolve.mockResolvedValue({
      status: 'ambiguo',
      candidatos: [
        { taskId: 'a1', nome: 'A', status: 'novo', lista: 'Leads' },
        { taskId: 'b2', nome: 'B', status: 'novo', lista: 'Leads' },
      ],
    });
    mocked.getTask.mockResolvedValue({ status: 'unico', card: card({ taskId: 'a1', nome: 'A' }) });
    renderPanel();
    expect(await screen.findByTestId('clickup-state-ambiguo')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('b2')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-state-unico')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /A/ }));
    expect(await screen.findByTestId('clickup-state-unico')).toBeInTheDocument();
    expect(mocked.getTask).toHaveBeenCalledWith('conv-1', 'a1');
  });

  it('unico mostra mutações só no card autorizado', async () => {
    mocked.resolve.mockResolvedValue({ status: 'unico', card: card() });
    renderPanel();
    expect(await screen.findByTestId('clickup-state-unico')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-mutations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir no clickup/i })).toHaveAttribute(
      'href',
      'https://app.clickup.test/t/task-1',
    );
    const users = screen.getByDisplayValue('x');
    expect(users).toBeDisabled();
  });

  it('503 integração não configurada', async () => {
    mocked.resolve.mockRejectedValue(new Error('ClickUp não configurado'));
    renderPanel();
    expect(await screen.findByTestId('clickup-state-not-configured')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });

  it('upstream indisponível', async () => {
    mocked.resolve.mockRejectedValue(new Error('ClickUp indisponível'));
    renderPanel();
    expect(await screen.findByTestId('clickup-state-upstream')).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-mutations')).not.toBeInTheDocument();
  });
});

describe('SPEC-008 estados de grupo', () => {
  beforeEach(() => {
    mocked.resolveGroup.mockReset();
    mocked.searchGroupTasks.mockReset();
    mocked.bindGroupTask.mockReset();
    mocked.createGroupTask.mockReset();
  });

  it('AC-02 sem dossiê pede a aba Projeto e não busca task', async () => {
    mocked.resolveGroup.mockResolvedValue({ status: 'sem_dossie' });
    renderPanel('Grupo', true);
    expect(await screen.findByTestId('clickup-state-sem-dossie')).toBeInTheDocument();
    expect(screen.getByText(/aba Projeto/i)).toBeInTheDocument();
    expect(screen.queryByTestId('clickup-group-vincular')).not.toBeInTheDocument();
    expect(mocked.searchGroupTasks).not.toHaveBeenCalled();
    expect(mocked.bindGroupTask).not.toHaveBeenCalled();
  });

  it('AC-06 busca mostra N candidatos e só vincula no clique', async () => {
    const user = userEvent.setup();
    mocked.resolveGroup.mockResolvedValue({
      status: 'dossie_sem_task',
      project: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null },
      projectLists: [
        { id: 'list-holding', label: 'Holding' },
        { id: 'list-contencioso', label: 'Contencioso Judicial' },
      ],
    });
    mocked.searchGroupTasks.mockResolvedValue({
      candidatos: [
        { taskId: 'h1', nome: 'Holding Alfa', status: 'novo', lista: 'Holding' },
        { taskId: 'h2', nome: 'Holding Beta', status: 'novo', lista: 'Holding' },
      ],
    });
    mocked.bindGroupTask.mockResolvedValue({ ok: true, status: 'task_vinculada', card: card({ taskId: 'h1', nome: 'Holding Alfa' }) });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-group-vincular'));
    await user.type(screen.getByPlaceholderText(/cole a url/i), 'Holding');
    await user.click(screen.getByTestId('clickup-group-search'));
    expect(await screen.findByTestId('clickup-group-candidatos')).toBeInTheDocument();
    expect(screen.getByText('h1')).toBeInTheDocument();
    expect(screen.getByText('h2')).toBeInTheDocument();
    expect(mocked.bindGroupTask).not.toHaveBeenCalled();
    expect(screen.queryByTestId('clickup-state-task-vinculada')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Holding Alfa/ }));
    expect(mocked.bindGroupTask).toHaveBeenCalledWith('conv-1', 'h1');
    expect(await screen.findByTestId('clickup-state-task-vinculada')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-mutations')).toBeInTheDocument();
  });

  it('AC-08 seletor de criar usa só o catálogo D2', async () => {
    const user = userEvent.setup();
    mocked.resolveGroup.mockResolvedValue({
      status: 'dossie_sem_task',
      project: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: null },
      projectLists: [
        { id: 'list-holding', label: 'Holding' },
        { id: 'list-contencioso', label: 'Contencioso Judicial' },
      ],
    });
    renderPanel('Grupo', true);
    await user.click(await screen.findByTestId('clickup-group-criar'));
    const select = await screen.findByTestId('clickup-group-list');
    expect(select).toHaveTextContent('Holding');
    expect(select).toHaveTextContent('Contencioso Judicial');
    expect(select).not.toHaveTextContent('Processo de Vendas');
  });

  it('task vinculada reusa o card com mutações', async () => {
    mocked.resolveGroup.mockResolvedValue({
      status: 'task_vinculada',
      project: { id: 'proj-a', name: 'Holding Silva', clickupTaskId: 'task-1' },
      card: card(),
    });
    renderPanel('Grupo', true);
    expect(await screen.findByTestId('clickup-state-task-vinculada')).toBeInTheDocument();
    expect(screen.getByTestId('clickup-mutations')).toBeInTheDocument();
  });
});
