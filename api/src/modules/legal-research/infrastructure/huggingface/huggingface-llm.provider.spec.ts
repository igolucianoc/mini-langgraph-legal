import { afterEach, describe, expect, it, vi } from 'vitest';
import { HuggingFaceLlmProvider } from './huggingface-llm.provider';

const config = { apiToken: 'secret-token', model: 'test-model', timeoutMs: 5000 };

function mockFetchOnce(content: string, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      json: async () => ({ choices: [{ message: { content } }] }),
    })),
  );
}

describe('HuggingFaceLlmProvider (fetch mockado, sem rede)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('classifica e valida a saída com Zod', async () => {
    mockFetchOnce(
      JSON.stringify({
        intent: 'requirements',
        category: 'CONTRACTS',
        needsResearch: true,
        confidence: 0.8,
      }),
    );
    const provider = new HuggingFaceLlmProvider(config);

    const result = await provider.classify({ question: 'cobrança contratual' });

    expect(result.category).toBe('CONTRACTS');
    expect(result.intent).toBe('requirements');
  });

  it('extrai JSON mesmo com texto ao redor', async () => {
    mockFetchOnce(
      'Aqui está: {"summary":"ok","reasoning":"apoiado","citedChunkIds":["c1"]} fim',
    );
    const provider = new HuggingFaceLlmProvider(config);

    const result = await provider.analyze({
      question: 'q',
      evidence: [
        {
          chunkId: 'c1',
          documentId: 'd',
          title: 't',
          category: 'CONTRACTS',
          source: 's',
          snippet: 'x',
          score: 0.9,
        },
      ],
    });

    expect(result.citedChunkIds).toEqual(['c1']);
  });

  it('rejeita saída inválida (schema Zod)', async () => {
    mockFetchOnce(JSON.stringify({ intent: 'invalido', category: 'X' }));
    const provider = new HuggingFaceLlmProvider(config);

    await expect(
      provider.classify({ question: 'q' }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('lança erro em status não-ok sem vazar o token', async () => {
    mockFetchOnce('', false, 503);
    const provider = new HuggingFaceLlmProvider(config);

    await expect(provider.classify({ question: 'q' })).rejects.toThrow(
      /status 503/,
    );
  });
});
