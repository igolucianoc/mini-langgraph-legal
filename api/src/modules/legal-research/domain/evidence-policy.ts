import type { Evidence, LegalCategory } from './legal.types';

/** Configuração da política de suficiência de evidência. */
export interface EvidencePolicyConfig {
  /** Mínimo de evidências acima do threshold para considerar suficiente. */
  minEvidence: number;
  /** Score mínimo de similaridade para uma evidência "contar". */
  minScore: number;
}

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicyConfig = {
  minEvidence: 2,
  minScore: 0.35,
};

export interface EvidenceEvaluation {
  sufficient: boolean;
  strongEvidence: Evidence[];
  reason: string;
}

/**
 * Regra determinística de suficiência de evidência.
 *
 * Evidência é suficiente quando há pelo menos `minEvidence` trechos com score
 * acima de `minScore`. Se a pergunta tem categoria, exige-se que ao menos um
 * trecho forte seja da mesma categoria (cobertura mínima). Caso contrário, o
 * resultado deve ser marcado como insuficiente — nunca uma resposta inventada.
 */
export function evaluateEvidence(
  evidence: readonly Evidence[],
  category: LegalCategory | null,
  config: EvidencePolicyConfig = DEFAULT_EVIDENCE_POLICY,
): EvidenceEvaluation {
  const strongEvidence = evidence.filter((e) => e.score >= config.minScore);

  if (strongEvidence.length < config.minEvidence) {
    return {
      sufficient: false,
      strongEvidence,
      reason: `Apenas ${strongEvidence.length} evidência(s) acima do limiar (mínimo ${config.minEvidence}).`,
    };
  }

  if (category !== null) {
    const hasCategoryCoverage = strongEvidence.some(
      (e) => e.category === category,
    );
    if (!hasCategoryCoverage) {
      return {
        sufficient: false,
        strongEvidence,
        reason: `Nenhuma evidência forte cobre a categoria ${category}.`,
      };
    }
  }

  return {
    sufficient: true,
    strongEvidence,
    reason: 'Evidência suficiente para gerar uma análise ancorada.',
  };
}
