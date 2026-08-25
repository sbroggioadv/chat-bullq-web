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
    },
  };
});

const mocked = clickupInboxService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
  getTask: ReturnType<typeof vi.fn>;
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ClickUpPanel conversationId="conv-1" />
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
  });

  it('grupo', async () => {
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
