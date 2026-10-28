import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateAgentDialog } from '@/features/ai-agents/components/create-agent-dialog';
import { aiAgentsService } from '@/features/ai-agents/services/ai-agents.service';

vi.mock('@/hooks/use-org-query-key', () => ({ useOrgId: () => 'test-org' }));
vi.mock(
  '@/features/ai-agents/services/ai-agents.service',
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import('@/features/ai-agents/services/ai-agents.service')
      >();
    return {
      ...original,
      aiAgentsService: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'created' }),
        uploadKnowledge: vi.fn(),
      },
    };
  },
);
vi.mock('@/features/ai-agents/components/agent-knowledge-field', () => ({
  AgentKnowledgeField: () => null,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function setup() {
  const onCreated = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CreateAgentDialog open onClose={vi.fn()} onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return { onCreated };
}
describe('Novo agente', () => {
  it('não avança sem nome', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent(
      'O que ele faz',
    );
    expect(aiAgentsService.create).not.toHaveBeenCalled();
  });
  it('preserva o prompt entre passos e cria explicitamente pausado sem simulação fictícia', async () => {
    const { onCreated } = setup();
    fireEvent.change(screen.getByPlaceholderText('Ex: Vendas Bravy'), {
      target: { value: 'Agente de teste' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Prompt revisado' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('textbox')).toHaveValue('Prompt revisado');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText(/Simulação ainda não disponível/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Criar e ativar' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Criar pausado' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(aiAgentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Agente de teste',
        systemPrompt: 'Prompt revisado',
        isActive: false,
      }),
    );
  });
});
