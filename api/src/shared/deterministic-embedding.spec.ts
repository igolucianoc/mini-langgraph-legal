import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_DIMENSION,
  embedText,
  toPgVector,
} from './deterministic-embedding';

describe('deterministic-embedding', () => {
  it('gera vetor com a dimensão configurada', () => {
    const vector = embedText('contrato de prestação de serviços');

    expect(vector).toHaveLength(EMBEDDING_DIMENSION);
  });

  it('é determinístico para o mesmo texto', () => {
    const a = embedText('inadimplemento contratual');
    const b = embedText('inadimplemento contratual');

    expect(a).toEqual(b);
  });

  it('produz vetores diferentes para textos diferentes', () => {
    const a = embedText('responsabilidade civil');
    const b = embedText('processo civil de execução');

    expect(a).not.toEqual(b);
  });

  it('normaliza o vetor (norma L2 ~ 1)', () => {
    const vector = embedText('direito do consumidor e vício do produto');

    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));

    expect(norm).toBeCloseTo(1, 5);
  });

  it('serializa no formato pgvector', () => {
    expect(toPgVector([0.1, -0.2, 0.3])).toBe('[0.1,-0.2,0.3]');
  });
});
