import { describe, expect, it } from 'vitest';
import { PROJECT_STATUSES, projectPhaseState } from '@/features/projects/project-fields';

describe('estado das fases do projeto', () => {
  it.each([
    ['IN_PROGRESS', ['concluída', 'concluída', 'atual', 'pendente', 'pendente']],
    ['DONE', ['concluída', 'concluída', 'concluída', 'pendente', 'atual']],
    ['PAUSED', ['concluída', 'concluída', 'concluída', 'atual', 'pendente']],
    ['', ['pendente', 'pendente', 'pendente', 'pendente', 'pendente']],
    ['UNKNOWN', ['pendente', 'pendente', 'pendente', 'pendente', 'pendente']],
  ])('interpreta %s', (current, expected) => {
    expect(PROJECT_STATUSES.map(phase => projectPhaseState(current, phase))).toEqual(expected);
  });
});
