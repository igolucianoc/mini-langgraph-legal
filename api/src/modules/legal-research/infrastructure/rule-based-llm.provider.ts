import type {
  AnalyzeInput,
  ClassifyInput,
  LlmProvider,
} from '../domain/contracts';
import type {
  AnalysisResult,
  Classification,
  LegalCategory,
  LegalIntent,
} from '../domain/legal.types';

const CATEGORY_KEYWORDS: Record<LegalCategory, string[]> = {
  CONTRACTS: ['contrato', 'contratual', 'acordo', 'cláusula', 'cobrança', 'dívida'],
  DEFAULT_BREACH: ['inadimplemento', 'mora', 'descumprimento', 'atraso'],
  CIVIL_LIABILITY: ['responsabilidade', 'indenização', 'dano', 'culpa', 'nexo'],
  CIVIL_PROCEDURE: ['processo', 'execução', 'petição', 'sentença', 'prova', 'juiz'],
  CONSUMER: ['consumidor', 'produto', 'vício', 'fornecedor', 'consumo'],
};

const OUT_OF_SCOPE = ['tempo', 'clima', 'receita', 'futebol', 'música'];

/**
 * LLM determinístico baseado em regras, para o modo `AI_PROVIDER=fake`.
 *
 * Classifica por palavras-chave e gera uma análise educacional ancorada nas
 * evidências (cita os chunkId reais). Não faz chamadas externas. Permite rodar
 * a aplicação completa, ponta a ponta, sem token da Hugging Face.
 */
export class RuleBasedLlmProvider implements LlmProvider {
  readonly modelName = 'rule-based-fake';

  async classify(input: ClassifyInput): Promise<Classification> {
    const q = input.question.toLowerCase();

    if (OUT_OF_SCOPE.some((kw) => q.includes(kw))) {
      return {
        intent: 'out_of_scope',
        category: null,
        needsResearch: false,
        confidence: 0.9,
      };
    }

    const category = this.detectCategory(q);
    const intent = this.detectIntent(q);

    return {
      intent,
      category,
      needsResearch: true,
      confidence: category ? 0.75 : 0.5,
    };
  }

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const cited = input.evidence.slice(0, 3);
    const summary =
      cited.length > 0
        ? `Com base no material educacional, os pontos relevantes para "${input.question}" estão nos trechos citados. Trata-se de orientação educacional, não de aconselhamento jurídico.`
        : 'Não há material educacional suficiente para uma orientação.';
    const reasoning = cited
      .map((e, i) => `(${i + 1}) ${e.title}: ${e.snippet}`)
      .join(' ');

    return {
      summary,
      reasoning: reasoning || 'Sem evidências para fundamentar a resposta.',
      citedChunkIds: cited.map((e) => e.chunkId),
    };
  }

  private detectCategory(q: string): LegalCategory | null {
    let best: LegalCategory | null = null;
    let bestScore = 0;
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
      LegalCategory,
      string[],
    ][]) {
      const score = keywords.filter((kw) => q.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        best = category;
      }
    }
    return best;
  }

  private detectIntent(q: string): LegalIntent {
    if (q.includes('requisito') || q.includes('preciso')) {
      return 'requirements';
    }
    if (q.includes('como') || q.includes('processo') || q.includes('passo')) {
      return 'procedure';
    }
    if (q.includes('direito') || q.includes('dever') || q.includes('obrigaç')) {
      return 'rights_obligations';
    }
    return 'explain_concept';
  }
}
