import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Conversation } from '../services/inbox.service';
import { ContactWorkspacePanel } from './contact-workspace-panel';

vi.mock('./project-panel', () => ({
  ProjectPanel: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="project-panel">projeto:{conversationId}</div>
  ),
}));

vi.mock('../services/clickup-inbox.service', () => ({
  clickupInboxService: {
    resolve: vi.fn(async () => ({ status: 'sem_card' })),
    getTask: vi.fn(),
    patchStatus: vi.fn(),
    patchField: vi.fn(),
    postComment: vi.fn(),
    postActivity: vi.fn(),
    completeActivity: vi.fn(),
    createTask: vi.fn(),
    resolveGroup: vi.fn(async () => ({ status: 'sem_dossie' })),
    searchGroupTasks: vi.fn(),
    bindGroupTask: vi.fn(),
    createGroupTask: vi.fn(),
  },
  classifyClickUpError: () => 'generic',
}));

function conv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    organizationId: 'org-a',
    channelId: 'ch-1',
    contactId: 'ct-1',
    assignedToId: null,
    status: 'OPEN',
    protocol: null,
    isGroup: false,
    aiAllowedInGroup: false,
    lastMessageAt: null,
    createdAt: '2026-08-25',
    contact: { id: 'ct-1', name: 'Maria', phone: '+55 11 99876-5432', avatarUrl: null },
    channel: { id: 'ch-1', type: 'WHATSAPP', name: 'Zap' },
    assignedTo: null,
    messages: [],
    _count: { messages: 0 },
    ...overrides,
  };
}

function renderPanel(conversation = conv()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContactWorkspacePanel conversation={conversation} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('AC-01 Contact Workspace + ClickUp', () => {
  it('renderiza cinco tabs, abre ClickUp e preserva ProjectPanel', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole('button', { name: /contato/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /e-mail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agenda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /projeto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clickup/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clickup/i }));
    expect(await screen.findByTestId('clickup-state-sem-card')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /projeto/i }));
    expect(screen.getByTestId('project-panel')).toHaveTextContent('projeto:conv-1');
  });
});
