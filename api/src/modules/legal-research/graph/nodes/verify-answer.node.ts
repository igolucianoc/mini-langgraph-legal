import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/**
 * Nó 6: verifica a análise contra as evidências (anti-alucinação) e calcula a
 * confiança. Se `analysis` estiver ausente, marca não aceito.
 */
export function createVerifyAnswerNode(ctx: NodeContext) {
  return async function verifyAnswer(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    if (!state.analysis) {
      return { status: 'verifying', citations: [], confidence: 0 };
    }

    const result = ctx.verifier.verify({
      analysis: state.analysis,
      evidence: state.evidence,
    });

    return {
      status: 'verifying',
      citations: result.citations,
      confidence: result.confidence,
    };
  };
}
