import { cleanup, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { AgentsPageHeader } from '@/features/ai-agents/components/agents-page-header';

afterEach(cleanup);

it('renderiza sozinho no servidor e no navegador, sem provider ou props obrigatórias', () => {
  expect(renderToStaticMarkup(<AgentsPageHeader />)).toContain('<h1>Agentes</h1>');
  render(<AgentsPageHeader />);
  expect(screen.getByRole('heading', { level: 1, name: 'Agentes' })).toBeVisible();
  expect(
    screen.getByText(
      'Os agentes de IA que atendem pelo escritório: quem são, quanto custam e como melhorar.',
    ),
  ).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('recebe ferramentas opcionais dentro do mesmo cabeçalho', () => {
  render(
    <AgentsPageHeader>
      <button>Ferramenta da página</button>
    </AgentsPageHeader>,
  );
  expect(
    within(screen.getByRole('banner')).getByRole('button', {
      name: 'Ferramenta da página',
    }),
  ).toBeVisible();
});
