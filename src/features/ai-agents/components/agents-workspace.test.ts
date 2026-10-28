import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Testa os seletores reais do módulo contra os tokens de classe de elementos.
const css = readFileSync(
  'src/features/ai-agents/components/agents-workspace.module.css',
  'utf8',
);
const selectors = [...css.matchAll(/:global\((\[class[^)]+)\)/g)].map(
  (match) => match[1],
);
function matches(className: string) {
  const element = document.createElement('span');
  element.className = className;
  return selectors.filter((selector) => element.matches(selector));
}

it.each([
  'bg-primary text-primary-foreground hover:bg-primary/90',
  'bg-emerald-500',
  'bg-red-500',
  'bg-blue-500',
  'hover:bg-zinc-100',
  'dark:hover:bg-zinc-800',
  'hover:text-zinc-900',
  'hover:border-zinc-200',
])('não repinta %s', (classes) => {
  expect(matches(classes)).toEqual([]);
});
it.each([
  'text-zinc-900',
  'dark:text-zinc-100',
  'bg-zinc-50',
  'dark:bg-zinc-900/50',
  'border-zinc-200',
])('mantém o mapeamento zinc explícito de %s', (classes) => {
  expect(matches(classes).length).toBeGreaterThan(0);
});
