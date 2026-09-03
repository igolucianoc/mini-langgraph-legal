import { describe, expect, it } from 'vitest';
import { FakeRetrievalProvider } from './fake-retrieval.provider';
import { buildFakeCorpus } from '../testing/fake-corpus';

describe('FakeRetrievalProvider', () => {
  const provider = new FakeRetrievalProvider(buildFakeCorpus());

  it('retorna apenas evidências existentes no corpus', async () => {
    const results = await provider.search({
      question: 'requisitos para cobrança de dívida contratual',
      category: null,
      topK: 5,
      threshold: 0,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const evidence of results) {
      expect(evidence.chunkId).toBeTruthy();
      expect(evidence.snippet).toBeTruthy();
    }
  });

  it('respeita o filtro por categoria', async () => {
    const results = await provider.search({
      question: 'vício do produto e direitos do consumidor',
      category: 'CONSUMER',
      topK: 10,
      threshold: 0,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.category === 'CONSUMER')).toBe(true);
  });

  it('respeita o topK', async () => {
    const results = await provider.search({
      question: 'contrato inadimplemento responsabilidade processo consumidor',
      category: null,
      topK: 2,
      threshold: 0,
    });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('ordena por score decrescente', async () => {
    const results = await provider.search({
      question: 'responsabilidade civil e dever de indenizar',
      category: null,
      topK: 5,
      threshold: 0,
    });

    const scores = results.map((e) => e.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it('aplica o threshold de similaridade', async () => {
    const results = await provider.search({
      question: 'xyzabc termo totalmente irrelevante zzz',
      category: null,
      topK: 5,
      threshold: 0.9,
    });

    expect(results.every((e) => e.score >= 0.9)).toBe(true);
  });

  it('é determinístico para a mesma pergunta', async () => {
    const q = {
      question: 'obrigações e mora do devedor',
      category: null,
      topK: 5,
      threshold: 0,
    } as const;

    const a = await provider.search(q);
    const b = await provider.search(q);

    expect(a.map((e) => e.chunkId)).toEqual(b.map((e) => e.chunkId));
  });
});
