import { describe, expect, it } from 'vitest';
import { translateSkipReason } from './chat-panel';

describe('motivo de pausa da IA', () => {
  it('traduz grupo desligado', () => {
    expect(translateSkipReason('GROUP_AI_OFF')).toBe('IA não ligada nesse grupo');
  });
});
