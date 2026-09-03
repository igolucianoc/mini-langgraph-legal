import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/** Nó 3: recupera evidências da base. Incrementa a tentativa corrente. */
export function createRetrieveEvidenceNode(ctx: NodeContext) {
  return async function retrieveEvidence(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    const evidence = await ctx.retrieval.search({
      question: state.question,
      category: state.category,
      topK: ctx.retrievalTopK,
      threshold: ctx.retrievalThreshold,
    });

    return {
      status: 'retrieving',
      evidence,
      attempt: state.attempt + 1,
    };
  };
}
