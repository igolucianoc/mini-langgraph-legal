import { describe, expect, it } from 'vitest';
import { DeterministicAnswerVerifier } from './answer-verifier';
import type { Evidence } from './legal.types';

const verifier = new DeterministicAnswerVerifier();

const evidence: Evidence[] = [
  {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    title: 'Contratos',
    category: 'CONTRACTS',
    source: 'fonte',
    snippet: 'trecho um',
    score: 0.8,
  },
  {
    chunkId: 'chunk-2',
    documentId: 'doc-1',
    title: 'Contratos',
    category: 'CONTRACTS',
    source: 'fonte',
    snippet: 'trecho dois',
    score: 0.6,
  },
];

describe('DeterministicAnswerVerifier', () => {
  it('aceita quando todas as citações existem nas evidências', () => {
    const result = verifier.verify({
      analysis: {
        summary: 'ok',
        reasoning: 'apoiado',
        citedChunkIds: ['chunk-1', 'chunk-2'],
      },
      evidence,
    });

    expect(result.accepted).toBe(true);
    expect(result.citations).toHaveLength(2);
    expect(result.invalidCitedChunkIds).toHaveLength(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('rejeita e reporta citações inventadas (anti-alucinação)', () => {
    const result = verifier.verify({
      analysis: {
        summary: 'ok',
        reasoning: 'apoiado',
        citedChunkIds: ['chunk-1', 'chunk-inexistente'],
      },
      evidence,
    });

    expect(result.accepted).toBe(false);
    expect(result.invalidCitedChunkIds).toContain('chunk-inexistente');
    expect(result.confidence).toBe(0);
  });

  it('rejeita quando não há nenhuma citação', () => {
    const result = verifier.verify({
      analysis: { summary: 'ok', reasoning: 'sem fonte', citedChunkIds: [] },
      evidence,
    });

    expect(result.accepted).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('confiança fica entre 0 e 1', () => {
    const result = verifier.verify({
      analysis: {
        summary: 'ok',
        reasoning: 'apoiado',
        citedChunkIds: ['chunk-1'],
      },
      evidence,
    });

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
