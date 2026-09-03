import type {
  AnalyzeInput,
  ClassifyInput,
  LlmProvider,
} from '../domain/contracts';
import type {
  AnalysisResult,
  Classification,
} from '../domain/legal.types';

export interface FakeLlmOptions {
  classify?: (input: ClassifyInput) => Classification;
  analyze?: (input: AnalyzeInput) => AnalysisResult;
}

/**
 * LLM fake determinístico para testes do grafo.
 *
 * Por padrão: classifica como CONTRACTS/requirements com pesquisa; a análise
 * cita todas as evidências recebidas (comportamento "bem-comportado"). Handlers
 * podem ser sobrescritos para simular cenários específicos.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly modelName = 'fake-llm';

  constructor(private readonly options: FakeLlmOptions = {}) {}

  async classify(input: ClassifyInput): Promise<Classification> {
    if (this.options.classify) {
      return this.options.classify(input);
    }
    return {
      intent: 'requirements',
      category: 'CONTRACTS',
      needsResearch: true,
      confidence: 0.8,
    };
  }

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    if (this.options.analyze) {
      return this.options.analyze(input);
    }
    return {
      summary: 'Análise educacional baseada nas evidências recuperadas.',
      reasoning: 'Cada ponto está ancorado nos trechos citados.',
      citedChunkIds: input.evidence.map((e) => e.chunkId),
    };
  }
}
