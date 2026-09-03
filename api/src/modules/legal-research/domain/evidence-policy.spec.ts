import { describe, expect, it } from 'vitest';
import { evaluateEvidence } from './evidence-policy';
import type { Evidence } from './legal.types';

function evidence(partial: Partial<Evidence> & { chunkId: string }): Evidence {
  return {
    chunkId: partial.chunkId,
    documentId: partial.documentId ?? 'doc-1',
    title: partial.title ?? 'Doc',
    category: partial.category ?? 'CONTRACTS',
    source: partial.source ?? 'fonte',
    snippet: partial.snippet ?? 'trecho',
    score: partial.score ?? 0.5,
  };
}

describe('evaluateEvidence', () => {
  it('marca insuficiente quando há menos evidências que o mínimo', () => {
    const result = evaluateEvidence(
      [evidence({ chunkId: 'a', score: 0.9 })],
      'CONTRACTS',
    );

    expect(result.sufficient).toBe(false);
    expect(result.reason).toMatch(/mínimo/i);
  });

  it('ignora evidências abaixo do score mínimo', () => {
    const result = evaluateEvidence(
      [
        evidence({ chunkId: 'a', score: 0.9 }),
        evidence({ chunkId: 'b', score: 0.1 }),
      ],
      'CONTRACTS',
    );

    expect(result.sufficient).toBe(false);
    expect(result.strongEvidence).toHaveLength(1);
  });

  it('marca insuficiente quando nenhuma evidência forte cobre a categoria', () => {
    const result = evaluateEvidence(
      [
        evidence({ chunkId: 'a', score: 0.9, category: 'CONSUMER' }),
        evidence({ chunkId: 'b', score: 0.8, category: 'CONSUMER' }),
      ],
      'CONTRACTS',
    );

    expect(result.sufficient).toBe(false);
    expect(result.reason).toMatch(/categoria/i);
  });

  it('marca suficiente com evidências fortes e cobertura de categoria', () => {
    const result = evaluateEvidence(
      [
        evidence({ chunkId: 'a', score: 0.9, category: 'CONTRACTS' }),
        evidence({ chunkId: 'b', score: 0.7, category: 'CONTRACTS' }),
      ],
      'CONTRACTS',
    );

    expect(result.sufficient).toBe(true);
    expect(result.strongEvidence).toHaveLength(2);
  });

  it('não exige categoria quando a pergunta não tem categoria', () => {
    const result = evaluateEvidence(
      [
        evidence({ chunkId: 'a', score: 0.9, category: 'CONSUMER' }),
        evidence({ chunkId: 'b', score: 0.8, category: 'CIVIL_PROCEDURE' }),
      ],
      null,
    );

    expect(result.sufficient).toBe(true);
  });
});
