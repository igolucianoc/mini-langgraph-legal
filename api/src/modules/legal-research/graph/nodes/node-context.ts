import type {
  AnswerVerifier,
  LlmProvider,
  RetrievalProvider,
} from '../../domain/contracts';
import type { EvidencePolicyConfig } from '../../domain/evidence-policy';

/** Dependências e parâmetros injetados nos nós do grafo. */
export interface NodeContext {
  llm: LlmProvider;
  retrieval: RetrievalProvider;
  verifier: AnswerVerifier;
  retrievalTopK: number;
  retrievalThreshold: number;
  evidencePolicy: EvidencePolicyConfig;
}
