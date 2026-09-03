import type { LegalCategory, ResearchOutcome } from '@/lib/types';

export const CATEGORY_LABELS: Record<LegalCategory, string> = {
  CONTRACTS: 'Contratos',
  DEFAULT_BREACH: 'Inadimplemento',
  CIVIL_LIABILITY: 'Responsabilidade civil',
  CIVIL_PROCEDURE: 'Processo civil',
  CONSUMER: 'Direito do consumidor',
};

export function categoryLabel(category: LegalCategory | null): string {
  return category ? CATEGORY_LABELS[category] : 'Não classificada';
}

/** Rótulos em pt-BR para os desfechos possíveis de uma execução. */
export const OUTCOME_LABELS: Record<ResearchOutcome, string> = {
  ANSWERED: 'Finalizado',
  INSUFFICIENT_EVIDENCE: 'Evidência insuficiente',
  DIRECT_ANSWER: 'Resposta direta',
  FAILED: 'Falhou',
};

export function outcomeLabel(outcome: ResearchOutcome | null): string {
  return outcome ? OUTCOME_LABELS[outcome] : 'Pendente';
}

export function confidenceLabel(confidence: number | null): string {
  if (confidence === null) {
    return '—';
  }
  return `${Math.round(confidence * 100)}%`;
}
