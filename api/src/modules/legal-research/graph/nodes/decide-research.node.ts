import type {
  LegalResearchState,
  LegalResearchUpdate,
} from '../legal-research.state';

/**
 * Nó 2: consolida a decisão de pesquisar.
 *
 * Regra de negócio do projeto: toda pergunta JURÍDICA deve ser ancorada na base
 * documental. Portanto, pesquisamos sempre que a intenção NÃO for `out_of_scope`.
 * O palpite `needsResearch` do LLM é apenas um sinal e NÃO pode, sozinho, pular a
 * pesquisa — caso contrário perguntas conceituais legítimas cairiam em
 * "fora de escopo" indevidamente. Só perguntas realmente fora do domínio
 * jurídico (tempo, esportes, etc.) seguem para `direct_answer`.
 */
export function createDecideResearchNode() {
  return async function decideResearch(
    state: LegalResearchState,
  ): Promise<LegalResearchUpdate> {
    const needsResearch = state.intent !== 'out_of_scope';
    return { needsResearch };
  };
}
