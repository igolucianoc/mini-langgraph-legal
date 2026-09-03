import { describe, expect, it } from 'vitest';
import { RuleBasedLlmProvider } from './rule-based-llm.provider';
import type { Evidence } from '../domain/legal.types';

const llm = new RuleBasedLlmProvider();

function evidence(chunkId: string): Evidence {
  return {
    chunkId,
    documentId: 'doc',
    title: 'Doc',
    category: 'CONTRACTS',
    source: 'fonte',
    snippet: 'trecho',
    score: 0.8,
  };
}

describe('RuleBasedLlmProvider.classify', () => {
  it('classifica pergunta contratual como CONTRACTS com pesquisa', async () => {
    const result = await llm.classify({
      question: 'requisitos para cobrança de dívida contratual',
    });

    expect(result.category).toBe('CONTRACTS');
    expect(result.needsResearch).toBe(true);
    expect(result.intent).toBe('requirements');
  });

  it('classifica pergunta de consumidor como CONSUMER', async () => {
    const result = await llm.classify({
      question: 'quais direitos do consumidor diante de vício do produto?',
    });

    expect(result.category).toBe('CONSUMER');
  });

  it('marca out_of_scope sem pesquisa para pergunta irrelevante', async () => {
    const result = await llm.classify({
      question: 'qual a previsão do tempo para amanhã?',
    });

    expect(result.intent).toBe('out_of_scope');
    expect(result.needsResearch).toBe(false);
  });
});

describe('RuleBasedLlmProvider.analyze', () => {
  it('cita apenas os chunkId das evidências recebidas', async () => {
    const result = await llm.analyze({
      question: 'cobrança contratual',
      evidence: [evidence('c1'), evidence('c2')],
    });

    expect(result.citedChunkIds).toEqual(['c1', 'c2']);
    expect(result.summary).toContain('educacional');
  });

  it('não cita nada quando não há evidências', async () => {
    const result = await llm.analyze({
      question: 'pergunta',
      evidence: [],
    });

    expect(result.citedChunkIds).toHaveLength(0);
  });
});
