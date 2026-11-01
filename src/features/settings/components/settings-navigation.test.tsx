import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout from '@/app/(dashboard)/settings/layout';
import { settingsGroups, settingsItems, profileInitials } from '@/features/settings/components/settings-navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/settings/appearance/builder' }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: {children: React.ReactNode; href:string}) => <a href={href} {...Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'prefetch'))}>{children}</a> }));
afterEach(cleanup);
describe('navegação de Configurações', () => {
  it('preserva as treze rotas e agrupa em cinco seções', () => {
    expect(settingsGroups.map(group => group.label)).toEqual(['Você','Escritório','Atendimento','Jarvis e IA','Integrações']);
    for (const id of ['channels','segments','general','profile','appearance','ai','ai-credentials','members','contacts','tags','notifications','api-keys','quick-replies']) expect(settingsItems.some(item => item.id === id)).toBe(true);
  });
  it('destaca a seção nas subrotas e oferece voltar para a lista', () => {
    render(<SettingsLayout><div>Editor</div></SettingsLayout>);
    expect(screen.getByRole('link', {name:'Aparência'})).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('link', {name:'Configurações'})).toHaveAttribute('href','/settings/sections');
  });
  it('busca sem acento por palavras do domínio e mostra vazio honesto', () => {
    render(<SettingsLayout><div>Editor</div></SettingsLayout>);
    const search = screen.getByRole('textbox', {name:'Buscar nas configurações'});
    fireEvent.change(search,{target:{value:'notificacoes'}});
    expect(screen.getByRole('link',{name:'Notificações'})).toBeInTheDocument();
    expect(screen.queryByRole('link',{name:'Canais'})).not.toBeInTheDocument();
    fireEvent.change(search,{target:{value:'watchdog'}});
    expect(screen.getByRole('link',{name:'Conversas presas'})).toBeInTheDocument();
    fireEvent.change(search,{target:{value:'inexistente'}});
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma configuração encontrada');
  });
});

it.each([['  Ana Maria Silva  ', 'AS'], ['Ana', 'A'], ['', 'Sy'], ['Usuário de teste', 'UT']])('iniciais de %s preservam primeiro e último nomes', (name, initials) => {
  expect(profileInitials(name)).toBe(initials);
});
it('conserva cabeçalho e navegação durante suspensão do conteúdo', () => {
  const pending = new Promise(() => {});
  function PendingContent(): React.ReactNode { throw pending; }
  render(<SettingsLayout><PendingContent /></SettingsLayout>);
  expect(screen.getByRole('heading', { name: 'Aparência', level: 1 })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Seções das configurações' })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Carregando página' })).toBeVisible();
});
