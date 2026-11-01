import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/login-form';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

it('informa que o cadastro depende de convite sem oferecer cadastro aberto', () => {
  render(<LoginForm />);
  expect(screen.getByText('Cadastro somente por convite.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
});
