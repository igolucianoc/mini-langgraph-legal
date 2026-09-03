import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/** Nó 1: classifica intenção e categoria da pergunta usando o LLM. */
export function createClassifyQuestionNode(ctx: NodeContext) {
  return async function classifyQuestion(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    const classification = await ctx.llm.classify({ question: state.question });
    return {
      status: 'classifying',
      intent: classification.intent,
      category: classification.category,
      needsResearch: classification.needsResearch,
      confidence: classification.confidence,
    };
  };
}
