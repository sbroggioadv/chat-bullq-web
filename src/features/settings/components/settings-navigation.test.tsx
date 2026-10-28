import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout from '@/app/(dashboard)/settings/layout';
import { settingsGroups, settingsItems } from '@/features/settings/components/settings-navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/settings/appearance/builder' }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: {children: React.ReactNode; href:string}) => <a href={href} {...props}>{children}</a> }));
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
