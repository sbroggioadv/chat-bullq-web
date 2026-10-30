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
