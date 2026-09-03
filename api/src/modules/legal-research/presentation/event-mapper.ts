import type { LegalResearchState } from '../graph/legal-research.state';
import type { ResearchEvent } from './research-events';

/**
 * Mapeia o estado após um nó para um evento SSE intermediário.
 *
 * Os estados terminais (`completed`/`failed`) são emitidos pelo service com o
 * payload final consolidado, então aqui retornamos `null` para eles.
 */
export function mapStateToEvent(
  state: LegalResearchState,
  correlationId: string,
): ResearchEvent | null {
  const attempt = state.attempt;

  switch (state.status) {
    case 'classifying':
      return {
        type: 'classifying',
        correlationId,
        attempt,
        intent: state.intent,
        category: state.category,
        needsResearch: state.needsResearch,
      };
    case 'retrieving':
      return {
        type: 'retrieving',
        correlationId,
        attempt,
        evidenceCount: state.evidence.length,
      };
    case 'evidence_evaluated':
      return {
        type: 'evidence_evaluated',
        correlationId,
        attempt,
        evidenceCount: state.evidence.length,
        evidence: state.evidence,
      };
    case 'generating':
      return { type: 'generating', correlationId, attempt };
    case 'verifying':
      return {
        type: 'verifying',
        correlationId,
        attempt,
        citationCount: state.citations.length,
        confidence: state.confidence,
      };
    default:
      return null;
  }
}
