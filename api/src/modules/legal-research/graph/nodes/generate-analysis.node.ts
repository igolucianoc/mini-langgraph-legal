import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/** Nó 5: gera a análise estruturada ancorada nas evidências recuperadas. */
export function createGenerateAnalysisNode(ctx: NodeContext) {
  return async function generateAnalysis(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    const analysis = await ctx.llm.analyze({
      question: state.question,
      evidence: state.evidence,
    });
    return { status: 'generating', analysis };
  };
}
