import { END, START, StateGraph } from '@langchain/langgraph';
import { LegalResearchAnnotation } from './legal-research.state';
import type { NodeContext } from './nodes/node-context';
import { createClassifyQuestionNode } from './nodes/classify-question.node';
import { createDecideResearchNode } from './nodes/decide-research.node';
import { createRetrieveEvidenceNode } from './nodes/retrieve-evidence.node';
import { createEvaluateEvidenceNode } from './nodes/evaluate-evidence.node';
import { createGenerateAnalysisNode } from './nodes/generate-analysis.node';
import { createVerifyAnswerNode } from './nodes/verify-answer.node';
import { createFinalizeNode } from './nodes/finalize.node';
import {
  routeAfterDecision,
  routeAfterEvaluation,
  routeAfterVerification,
} from './routing/routing';

/**
 * Constrói e compila o grafo de triagem jurídica.
 *
 * Fluxo:
 *   classify → decide ──direct_answer──────────────→ finalize
 *                    └─research→ retrieve → evaluate ──insufficient→ finalize
 *                                              └sufficient→ generate → verify
 *                                                       ├accept→ finalize
 *                                                       ├retry→ retrieve (limite)
 *                                                       └insufficient→ finalize
 */
export function buildLegalResearchGraph(ctx: NodeContext) {
  const graph = new StateGraph(LegalResearchAnnotation)
    .addNode('classify', createClassifyQuestionNode(ctx))
    .addNode('decide', createDecideResearchNode())
    .addNode('retrieve', createRetrieveEvidenceNode(ctx))
    .addNode('evaluate', createEvaluateEvidenceNode(ctx))
    .addNode('generate', createGenerateAnalysisNode(ctx))
    .addNode('verify', createVerifyAnswerNode(ctx))
    .addNode('finalize', createFinalizeNode(ctx))
    .addEdge(START, 'classify')
    .addEdge('classify', 'decide')
    .addConditionalEdges('decide', routeAfterDecision, {
      research: 'retrieve',
      direct_answer: 'finalize',
    })
    .addEdge('retrieve', 'evaluate')
    .addConditionalEdges(
      'evaluate',
      (state) => routeAfterEvaluation(state, ctx.evidencePolicy),
      {
        sufficient: 'generate',
        insufficient: 'finalize',
      },
    )
    .addEdge('generate', 'verify')
    .addConditionalEdges('verify', routeAfterVerification, {
      accept: 'finalize',
      retry: 'retrieve',
      insufficient: 'finalize',
    })
    .addEdge('finalize', END);

  // recursionLimit defensivo: mesmo com bug de routing, nunca roda indefinidamente.
  return graph.compile();
}

export type CompiledLegalResearchGraph = ReturnType<
  typeof buildLegalResearchGraph
>;
