/**
 * Tipos de domínio da pesquisa jurídica.
 *
 * Estes tipos são a linguagem do domínio; não dependem de Prisma nem de SDKs de
 * provider. Adapters (etapa 07) traduzem entre estes tipos e a infraestrutura.
 */

/** Área jurídica aproximada. Espelha o enum do Prisma, mas é independente dele. */
export type LegalCategory =
  | 'CONTRACTS'
  | 'DEFAULT_BREACH'
  | 'CIVIL_LIABILITY'
  | 'CIVIL_PROCEDURE'
  | 'CONSUMER';

export const LEGAL_CATEGORIES: readonly LegalCategory[] = [
  'CONTRACTS',
  'DEFAULT_BREACH',
  'CIVIL_LIABILITY',
  'CIVIL_PROCEDURE',
  'CONSUMER',
];

/** Intenção aproximada da pergunta. */
export type LegalIntent =
  | 'explain_concept'
  | 'procedure'
  | 'rights_obligations'
  | 'requirements'
  | 'out_of_scope';

export const LEGAL_INTENTS: readonly LegalIntent[] = [
  'explain_concept',
  'procedure',
  'rights_obligations',
  'requirements',
  'out_of_scope',
];

/** Resultado da classificação da pergunta. */
export interface Classification {
  intent: LegalIntent;
  category: LegalCategory | null;
  /** Sugestão do classificador sobre necessidade de pesquisa documental. */
  needsResearch: boolean;
  confidence: number;
}

/** Trecho de evidência recuperado da base. */
export interface Evidence {
  chunkId: string;
  documentId: string;
  title: string;
  category: LegalCategory;
  source: string;
  snippet: string;
  score: number;
}

/** Citação exibida ao usuário; sempre derivada de uma Evidence recuperada. */
export interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  category: LegalCategory;
  snippet: string;
  score: number;
}

/** Análise estruturada gerada pelo LLM a partir das evidências. */
export interface AnalysisResult {
  summary: string;
  reasoning: string;
  citedChunkIds: string[];
}

/** Resultado final possível de uma execução. */
export type ResearchOutcome =
  | 'ANSWERED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'DIRECT_ANSWER'
  | 'FAILED';
