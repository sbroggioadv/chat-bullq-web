import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { classifyClickUpError } from './clickup-inbox.service';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    if (!/\.(ts|tsx)$/.test(name)) return [];
    if (name.includes('.test.')) return [];
    return [full];
  });
}

describe('AC-12 frontend', () => {
  it('não chama api.clickup.com nem importa Hoppe/Bravy/sinkra', () => {
    const roots = [
      path.resolve(__dirname),
      path.resolve(__dirname, '../components/clickup-panel.tsx'),
      path.resolve(__dirname, '../components/contact-workspace-panel.tsx'),
    ];
    const files = roots.flatMap((p) => (statSync(p).isDirectory() ? walk(p) : [p]));
    const joined = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(joined).not.toMatch(/api\.clickup\.com/);
    expect(joined).not.toMatch(/hoppe/i);
    expect(joined).not.toMatch(/bravy/i);
    expect(joined).not.toMatch(/sinkra/i);
    expect(joined).not.toMatch(/CLICKUP_API_KEY/);
    expect(joined).not.toMatch(/CLICKUP_API_TOKEN/);
  });
});

describe('classifyClickUpError', () => {
  it('separa 503 de upstream', () => {
    expect(classifyClickUpError(new Error('ClickUp não configurado'))).toBe('not_configured');
    expect(classifyClickUpError(new Error('ClickUp indisponível'))).toBe('upstream');
    expect(classifyClickUpError(new Error('ClickUp: tempo limite excedido'))).toBe('upstream');
  });
});
