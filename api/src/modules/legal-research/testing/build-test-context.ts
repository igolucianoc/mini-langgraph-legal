import { DeterministicAnswerVerifier } from '../domain/answer-verifier';
import { DEFAULT_EVIDENCE_POLICY } from '../domain/evidence-policy';
import { FakeRetrievalProvider } from '../infrastructure/fake-retrieval.provider';
import type { NodeContext } from '../graph/nodes/node-context';
import type { LlmProvider, RetrievalProvider } from '../domain/contracts';
import { buildFakeCorpus } from './fake-corpus';
import { FakeLlmProvider } from './fake-llm.provider';

export interface TestContextOverrides {
  llm?: LlmProvider;
  retrieval?: RetrievalProvider;
  retrievalThreshold?: number;
  retrievalTopK?: number;
}

/** Monta um NodeContext com providers fake determinísticos para testes. */
export function buildTestContext(
  overrides: TestContextOverrides = {},
): NodeContext {
  return {
    llm: overrides.llm ?? new FakeLlmProvider(),
    retrieval:
      overrides.retrieval ?? new FakeRetrievalProvider(buildFakeCorpus()),
    verifier: new DeterministicAnswerVerifier(),
    retrievalTopK: overrides.retrievalTopK ?? 5,
    retrievalThreshold: overrides.retrievalThreshold ?? 0,
    evidencePolicy: DEFAULT_EVIDENCE_POLICY,
  };
}
