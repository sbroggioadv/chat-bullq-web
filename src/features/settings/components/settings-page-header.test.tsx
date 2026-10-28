import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsPageHeader, SETTINGS_PAGE_HEADER_FALLBACK } from '@/features/settings/components/settings-page-header';

afterEach(cleanup);

describe('cabeçalho isolado de Configurações', () => {
  it.each([
    ['/settings/general', 'Organização', 'Dados do escritório. Aparecem no menu e nas comunicações.'],
    ['/settings/profile', 'Perfil', 'Como você aparece para a equipe.'],
    ['/settings/channels', 'Canais', 'WhatsApp, Instagram, Gmail e as demais caixas de entrada.'],
    ['/settings/contacts', 'Contatos', 'Todos os contatos que já falaram com o escritório.'],
    ['/settings/channels/new', 'Canais', 'WhatsApp, Instagram, Gmail e as demais caixas de entrada.'],
    ['/settings', 'Configurações', 'Escolha uma seção para começar.'],
    ['/settings/sections', 'Configurações', 'Escolha uma seção para começar.'],
    ['/settings/profile-other', 'Configurações', 'Escolha uma seção para começar.'],
  ])('renderiza %s sem provider de dados ou navegação', (pathname, title, description) => {
    const { container } = render(<SettingsPageHeader pathname={pathname} />);

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getByText(description)).toBeVisible();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(container.querySelectorAll('#settings-heading-actions')).toHaveLength(1);
  });

  it('disponibiliza a variante sem seção para renderização estática do fallback', () => {
    expect(SETTINGS_PAGE_HEADER_FALLBACK).toEqual({
      label: 'Configurações',
      description: 'Escolha uma seção para começar.',
    });
    const html = renderToStaticMarkup(<SettingsPageHeader pathname="/settings/sections" />);

    expect(html).toContain(`<h1>${SETTINGS_PAGE_HEADER_FALLBACK.label}</h1>`);
    expect(html).toContain(`<p>${SETTINGS_PAGE_HEADER_FALLBACK.description}</p>`);
    expect(html).toContain('data-tone="neutral"');
  });
});
