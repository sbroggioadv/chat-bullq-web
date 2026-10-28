import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserProfileForm } from '@/features/user-profile/components/user-profile-form';

const { save } = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/features/user-profile/hooks/use-user-profile', () => ({
  useUserProfile: () => ({ user: { id: 'test-user', name: 'Pessoa', email: 'test@example.test', avatarUrl: null }, save, isSaving: false }),
}));
vi.mock('@/components/ui/image-upload', () => ({ ImageUpload: ({ placeholderIcon: Placeholder }: { placeholderIcon: React.ElementType }) => <Placeholder /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('limite do nome do perfil', () => {
  it('limita a digitação a 120 caracteres e salva somente o nome válido', async () => {
    const user = userEvent.setup();
    render(<UserProfileForm />);
    const input = screen.getByRole('textbox', { name: 'Nome completo' });
    expect(input).toHaveAttribute('maxlength', '120');
    await user.clear(input);
    await user.type(input, 'N'.repeat(121));
    expect(input).toHaveValue('N'.repeat(120));
    expect(screen.getByText('120/120 caracteres')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar', exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ name: 'N'.repeat(120) }));
  });
  it('mantém e-mail somente leitura e descarta o nome sem enviar PATCH', async () => {
    const user = userEvent.setup();
    render(<UserProfileForm />);
    const email = screen.getByRole('textbox', { name: 'E-mail' });
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveValue('test@example.test');
    const input = screen.getByRole('textbox', { name: 'Nome completo' });
    await user.clear(input);
    expect(screen.getByText('Mínimo 2 caracteres')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(input).toHaveValue('Pessoa');
    expect(screen.queryByRole('region', { name: 'Alterações pendentes' })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

});

it('oferece iniciais do rascunho e título sem salto de h1 para h3', async () => {
  const user = userEvent.setup(); render(<UserProfileForm />);
  expect(screen.getByRole('heading', { name: 'Foto de perfil', level: 2 })).toBeVisible();
  const name = screen.getByRole('textbox', { name: 'Nome completo' });
  await user.clear(name); await user.type(name, 'Ana Maria Silva');
  expect(screen.getByText('AS')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Descartar' }));
  expect(screen.getByText('P')).toBeInTheDocument();
});
