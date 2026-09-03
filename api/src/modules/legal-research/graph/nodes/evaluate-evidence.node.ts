import { evaluateEvidence } from '../../domain/evidence-policy';
import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';
import type { NodeContext } from './node-context';

/**
 * Nó 4: avalia a suficiência das evidências recuperadas.
 *
 * A decisão de fluxo (suficiente/insuficiente) é feita no routing; aqui apenas
 * registramos o status. A avaliação usa a política determinística do domínio.
 */
export function createEvaluateEvidenceNode(ctx: NodeContext) {
  return async function evaluateEvidenceNode(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    // Recalcular aqui mantém o nó puro; o routing chama a mesma política.
    evaluateEvidence(state.evidence, state.category, ctx.evidencePolicy);
    return { status: 'evidence_evaluated' };
  };
}
