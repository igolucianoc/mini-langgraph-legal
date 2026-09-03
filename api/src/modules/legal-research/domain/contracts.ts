import type {
  AnalysisResult,
  Classification,
  Citation,
  Evidence,
  LegalCategory,
} from './legal.types';

/** Entrada para classificação de uma pergunta. */
export interface ClassifyInput {
  question: string;
}

/** Entrada para geração da análise. */
export interface AnalyzeInput {
  question: string;
  evidence: readonly Evidence[];
}

/**
 * Contrato do provider de LLM. O domínio depende desta interface, nunca do SDK.
 */
export interface LlmProvider {
  readonly modelName: string;
  classify(input: ClassifyInput): Promise<Classification>;
  analyze(input: AnalyzeInput): Promise<AnalysisResult>;
}

/** Contrato do provider de embeddings. */
export interface EmbeddingsProvider {
  embed(texts: readonly string[]): Promise<number[][]>;
}

/** Consulta de retrieval por similaridade. */
export interface RetrievalQuery {
  question: string;
  category: LegalCategory | null;
  topK: number;
  threshold: number;
}

/** Contrato de retrieval. Retorna apenas evidências existentes na base. */
export interface RetrievalProvider {
  search(query: RetrievalQuery): Promise<Evidence[]>;
}

/** Entrada da verificação da resposta. */
export interface VerifyInput {
  analysis: AnalysisResult;
  evidence: readonly Evidence[];
}

/** Resultado determinístico da verificação anti-alucinação. */
export interface VerifyResult {
  accepted: boolean;
  confidence: number;
  citations: Citation[];
  /** Ids citados pelo modelo que não existem entre as evidências. */
  invalidCitedChunkIds: string[];
}

/** Contrato do verificador (determinístico, sem LLM). */
export interface AnswerVerifier {
  verify(input: VerifyInput): VerifyResult;
}

// Tokens de injeção (NestJS) para os contratos acima.
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
export const EMBEDDINGS_PROVIDER = Symbol('EMBEDDINGS_PROVIDER');
export const RETRIEVAL_PROVIDER = Symbol('RETRIEVAL_PROVIDER');
export const ANSWER_VERIFIER = Symbol('ANSWER_VERIFIER');
