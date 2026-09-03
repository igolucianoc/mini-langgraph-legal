import { Annotation } from '@langchain/langgraph';
import type {
  AnalysisResult,
  Citation,
  Evidence,
  LegalCategory,
  LegalIntent,
  ResearchOutcome,
} from '../domain/legal.types';

/** Status corrente da execução, alinhado aos eventos de streaming (etapa 08). */
export type ExecutionStatus =
  | 'started'
  | 'classifying'
  | 'retrieving'
  | 'evidence_evaluated'
  | 'generating'
  | 'verifying'
  | 'completed'
  | 'failed';

/**
 * Estado compartilhado e tipado do grafo.
 *
 * Cada nó devolve um patch parcial. Os campos escalares usam o reducer padrão
 * (último valor vence); `evidence` é substituído a cada retrieval (não acumula
 * entre tentativas, para refletir a evidência da tentativa corrente).
 */
export const LegalResearchAnnotation = Annotation.Root({
  question: Annotation<string>,
  correlationId: Annotation<string>,

  intent: Annotation<LegalIntent | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  category: Annotation<LegalCategory | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  needsResearch: Annotation<boolean | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  evidence: Annotation<Evidence[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  analysis: Annotation<AnalysisResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  citations: Annotation<Citation[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  confidence: Annotation<number | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  attempt: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  maxAttempts: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 2,
  }),
  status: Annotation<ExecutionStatus>({
    reducer: (_prev, next) => next,
    default: () => 'started',
  }),
  outcome: Annotation<ResearchOutcome | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type LegalResearchState = typeof LegalResearchAnnotation.State;
export type LegalResearchUpdate = typeof LegalResearchAnnotation.Update;
