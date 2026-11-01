import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('não usa primary-foreground nos conteúdos de mensagens enviadas', () => {
  for (const name of ['media-bubbles.tsx', 'story-reply-card.tsx', 'chat-panel.tsx']) {
    const source = readFileSync(new URL(name, import.meta.url), 'utf8');
    // O aviso de arrastar tem fundo primário e fica fora dos balões.
    const bubbles = source.replace('text-primary-foreground shadow-lg', 'text-on-primary shadow-lg');
    expect(bubbles, name).not.toMatch(/(?:text|bg|border|hover:bg)-primary-foreground/);
  }
});

it('usa o turquesa Synq nos tokens do balão enviado claro', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const light = css.split('html[data-mode="light"] {')[1].split('}')[0];
  expect(light).toContain('--bq-bubble-out: rgb(15 157 148 / 0.10)');
  expect(light).toContain('--bq-bubble-out-hair: rgb(15 157 148 / 0.24)');
});

it('usa o turquesa Synq nos tokens do balão enviado escuro', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const dark = css.split(':root {')[2].split('}')[0];
  expect(dark).toContain('--bq-bubble-out: rgb(15 157 148 / 0.18)');
  expect(dark).toContain('--bq-bubble-out-hair: rgb(15 157 148 / 0.32)');
});

it('usa cores contrastantes na trilha do áudio enviado e preserva o recebido', () => {
  const source = readFileSync('src/features/inbox/components/audio-message-player.tsx', 'utf8');
  expect(source).toMatch(/const colorAccent = isOutbound\s*\? 'bg-\[var\(--bq-t2\)\]'\s*: 'bg-\[var\(--bq-raised-2\)\] '/);
  expect(source).toMatch(/const colorAccentFilled = isOutbound\s*\? 'bg-\[var\(--bq-solid-fg\)\]'\s*: 'bg-primary'/);
});
