import { evaluateEvidence } from '../../domain/evidence-policy';
import type { ResearchOutcome } from '../../domain/legal.types';
import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/**
 * Nó 7: consolida o resultado final.
 *
 * Determina o `outcome` a partir do estado acumulado:
 * - sem pesquisa → DIRECT_ANSWER;
 * - com citações aceitas → ANSWERED;
 * - caso contrário → INSUFFICIENT_EVIDENCE.
 * Um erro previamente registrado leva a FAILED.
 */
export function createFinalizeNode(ctx: NodeContext) {
  return async function finalize(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    if (state.error) {
      return { status: 'failed', outcome: 'FAILED' };
    }

    if (state.needsResearch === false) {
      return { status: 'completed', outcome: 'DIRECT_ANSWER' };
    }

    const evaluation = evaluateEvidence(
      state.evidence,
      state.category,
      ctx.evidencePolicy,
    );
    const hasAcceptedCitations = state.citations.length > 0;

    const outcome: ResearchOutcome =
      evaluation.sufficient && hasAcceptedCitations
        ? 'ANSWERED'
        : 'INSUFFICIENT_EVIDENCE';

    return { status: 'completed', outcome };
  };
}
