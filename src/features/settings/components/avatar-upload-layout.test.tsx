import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageUpload } from '@/components/ui/image-upload';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/features/settings/components/settings.module.css'), 'utf8');

// JSDOM has no layout/canvas. Keep the real upload and modal DOM, and assert
// that no compact-row selector can style the dialog or any of its children.
vi.mock('react-easy-crop', () => ({ default: () => <div>Área de corte</div> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('estilos do upload em linha', () => {
  it.each(['circle', 'square'] as const)('isola o modal de corte do upload %s', shape => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fixture', revokeObjectURL: vi.fn() });
    const { container } = render(<div className="avatarUpload"><ImageUpload shape={shape} value={null} onChange={vi.fn()} /></div>);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['fixture'], 'foto.png', { type: 'image/png' })] },
    });
    const dialog = screen.getByRole('dialog', { name: 'Ajustar imagem' });
    const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)]
      .flatMap(match => match[1].trim().split(','))
      .map(selector => selector.trim().replace(/:global\(([^)]+)\)/g, '$1'))
      .filter(selector => selector.startsWith('.avatarUpload'));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      for (const element of container.querySelectorAll(selector)) {
        expect(dialog.contains(element), `Regra da linha atingiu o modal: ${selector}`).toBe(false);
      }
    }
    expect(container.querySelector('.avatarUpload > div > div:not([role="dialog"])')).not.toBeNull();
  });
});
