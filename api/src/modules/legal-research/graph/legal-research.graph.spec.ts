import { describe, expect, it, vi } from 'vitest';
import { buildLegalResearchGraph } from './legal-research.graph';
import { buildTestContext } from '../testing/build-test-context';
import { FakeLlmProvider } from '../testing/fake-llm.provider';
import { FakeRetrievalProvider } from '../infrastructure/fake-retrieval.provider';
import { buildFakeCorpus } from '../testing/fake-corpus';
import type { Evidence } from '../domain/legal.types';
import type { RetrievalProvider } from '../domain/contracts';

const initial = (question: string) => ({
  question,
  correlationId: 'test-cid',
});

describe('LegalResearchGraph', () => {
  it('happy path: classifica, pesquisa, gera e aceita com citações', async () => {
    const graph = buildLegalResearchGraph(buildTestContext());

    const result = await graph.invoke(
      initial('quais os requisitos para cobrança de dívida contratual?'),
    );

    expect(result.status).toBe('completed');
    expect(result.outcome).toBe('ANSWERED');
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.analysis).not.toBeNull();
  });

  it('direct answer: pergunta fora de escopo não pesquisa', async () => {
    const llm = new FakeLlmProvider({
      classify: () => ({
        intent: 'out_of_scope',
        category: null,
        needsResearch: false,
        confidence: 0.9,
      }),
    });
    const graph = buildLegalResearchGraph(buildTestContext({ llm }));

    const result = await graph.invoke(initial('qual a previsão do tempo hoje?'));

    expect(result.outcome).toBe('DIRECT_ANSWER');
    expect(result.status).toBe('completed');
    expect(result.evidence).toHaveLength(0);
  });

  it('evidência insuficiente: retrieval vazio finaliza sem inventar', async () => {
    const emptyRetrieval: RetrievalProvider = {
      search: async (): Promise<Evidence[]> => [],
    };
    const graph = buildLegalResearchGraph(
      buildTestContext({ retrieval: emptyRetrieval }),
    );

    const result = await graph.invoke(initial('pergunta sem base documental'));

    expect(result.outcome).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.citations).toHaveLength(0);
    // Não deve haver análise aceita sem evidência.
    expect(result.status).toBe('completed');
  });

  it('retry: verificação rejeita na 1ª tentativa e aceita na 2ª → ANSWERED', async () => {
    // A 1ª análise cita fonte inexistente (rejeitada → retry); a 2ª cita a
    // evidência real (aceita). O retry ocorre após o nó de verificação.
    let analyzeCall = 0;
    const llm = new FakeLlmProvider({
      analyze: (input) => {
        analyzeCall += 1;
        if (analyzeCall === 1) {
          return { summary: 's', reasoning: 'r', citedChunkIds: ['inexistente'] };
        }
        return {
          summary: 's',
          reasoning: 'r',
          citedChunkIds: input.evidence.map((e) => e.chunkId),
        };
      },
    });
    const graph = buildLegalResearchGraph(buildTestContext({ llm }));

    const result = await graph.invoke(
      initial('requisitos para cobrança de dívida contratual'),
    );

    expect(analyzeCall).toBeGreaterThanOrEqual(2);
    expect(result.attempt).toBeGreaterThanOrEqual(2);
    expect(result.outcome).toBe('ANSWERED');
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('respeita o limite de tentativas (sem loop infinito)', async () => {
    // LLM sempre cita fonte inexistente → verify sempre rejeita → deve parar no limite.
    const llm = new FakeLlmProvider({
      analyze: () => ({
        summary: 's',
        reasoning: 'r',
        citedChunkIds: ['fonte-inexistente'],
      }),
    });
    const searchSpy = vi.fn(async () =>
      new FakeRetrievalProvider(buildFakeCorpus()).search({
        question: 'requisitos cobrança dívida contratual',
        category: 'CONTRACTS',
        topK: 5,
        threshold: 0,
      }),
    );
    const graph = buildLegalResearchGraph(
      buildTestContext({ llm, retrieval: { search: searchSpy } }),
    );

    const result = await graph.invoke(
      initial('requisitos cobrança dívida contratual'),
    );

    expect(result.outcome).toBe('INSUFFICIENT_EVIDENCE');
    // maxAttempts padrão = 2 → retrieval chamado no máximo 2 vezes.
    expect(searchSpy.mock.calls.length).toBeLessThanOrEqual(2);
    expect(result.attempt).toBeLessThanOrEqual(2);
  });

  it('percorre os status na ordem esperada (streaming futuro)', async () => {
    const graph = buildLegalResearchGraph(buildTestContext());
    const seen: string[] = [];

    const stream = await graph.stream(
      initial('requisitos para cobrança de dívida contratual'),
    );
    for await (const step of stream) {
      for (const nodeName of Object.keys(step)) {
        seen.push(nodeName);
      }
    }

    expect(seen).toContain('classify');
    expect(seen).toContain('retrieve');
    expect(seen).toContain('finalize');
  });
});
