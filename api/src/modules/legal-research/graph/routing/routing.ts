import { evaluateEvidence } from '../../domain/evidence-policy';
import type { EvidencePolicyConfig } from '../../domain/evidence-policy';
import type { LegalResearchState } from '../legal-research.state';

export type DecideResearchRoute = 'research' | 'direct_answer';
export type EvaluateEvidenceRoute = 'sufficient' | 'insufficient';
export type VerifyAnswerRoute = 'accept' | 'retry' | 'insufficient';

/** Roteia após a decisão de pesquisa. */
export function routeAfterDecision(
  state: LegalResearchState,
): DecideResearchRoute {
  return state.needsResearch === false ? 'direct_answer' : 'research';
}

/** Roteia após a avaliação de evidência, usando a política do domínio. */
export function routeAfterEvaluation(
  state: LegalResearchState,
  policy: EvidencePolicyConfig,
): EvaluateEvidenceRoute {
  const evaluation = evaluateEvidence(state.evidence, state.category, policy);
  return evaluation.sufficient ? 'sufficient' : 'insufficient';
}

/**
 * Roteia após a verificação.
 *
 * - `accept`: há citações válidas e confiança > 0.
 * - `retry`: rejeitado, mas ainda há tentativas disponíveis → volta ao retrieval.
 * - `insufficient`: rejeitado e sem tentativas restantes → finaliza sem inventar.
 *
 * O limite de tentativas garante que não há ciclo infinito.
 */
export function routeAfterVerification(
  state: LegalResearchState,
): VerifyAnswerRoute {
  const accepted = state.citations.length > 0 && (state.confidence ?? 0) > 0;
  if (accepted) {
    return 'accept';
  }
  if (state.attempt < state.maxAttempts) {
    return 'retry';
  }
  return 'insufficient';
}
