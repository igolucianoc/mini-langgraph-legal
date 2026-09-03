import type { LegalCategory } from '@/lib/types';

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

export function confidenceLabel(confidence: number | null): string {
  if (confidence === null) {
    return '—';
  }
  return `${Math.round(confidence * 100)}%`;
}
