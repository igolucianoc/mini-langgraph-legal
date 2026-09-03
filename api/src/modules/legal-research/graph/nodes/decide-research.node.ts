import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';

/**
 * Nó 2: consolida a decisão de pesquisar.
 *
 * Perguntas fora de escopo não disparam pesquisa (serão respondidas de forma
 * segura como `direct_answer`). Nos demais casos, respeita a sugestão da
 * classificação.
 */
export function createDecideResearchNode() {
  return async function decideResearch(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    const needsResearch =
      state.intent !== 'out_of_scope' && state.needsResearch !== false;
    return { needsResearch };
  };
}
