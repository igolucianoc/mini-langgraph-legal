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

  it('extrai JSON ignorando bloco de thinking com chaves no raciocínio', async () => {
    mockFetchOnce(
      '<think>vou usar {chaves} soltas no raciocínio {a:1}</think>' +
        '{"intent":"procedure","category":null,"needsResearch":false,"confidence":0.5}',
    );
    const provider = new HuggingFaceLlmProvider(config);

    const result = await provider.classify({ question: 'como dar entrada' });

    expect(result.intent).toBe('procedure');
    expect(result.category).toBeNull();
  });

  it('extrai JSON de dentro de fence markdown ```json', async () => {
    mockFetchOnce(
      'Segue a análise:\n```json\n' +
        '{"summary":"ok","reasoning":"apoiado nas evidências","citedChunkIds":["c1"]}\n' +
        '```',
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

  it('usa reasoning_content quando content vem vazio (modelos de reasoning)', async () => {
    // Modelos como MiniMax colocam a saída em reasoning_content.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                reasoning_content: JSON.stringify({
                  intent: 'requirements',
                  category: 'CONTRACTS',
                  needsResearch: true,
                  confidence: 0.7,
                }),
              },
            },
          ],
        }),
      })),
    );
    const provider = new HuggingFaceLlmProvider(config);

    const result = await provider.classify({ question: 'cobrança contratual' });

    expect(result.category).toBe('CONTRACTS');
  });
});
