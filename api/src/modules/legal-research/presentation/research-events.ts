import type {
  Citation,
  Evidence,
  LegalCategory,
  LegalIntent,
  ResearchOutcome,
} from '../domain/legal.types';

/** Nome dos eventos SSE emitidos durante a execução do grafo. */
export type ResearchEventType =
  | 'started'
  | 'classifying'
  | 'retrieving'
  | 'evidence_evaluated'
  | 'generating'
  | 'verifying'
  | 'completed'
  | 'failed';

interface BaseEvent {
  correlationId: string;
  attempt: number;
}

export interface StartedEvent extends BaseEvent {
  type: 'started';
  question: string;
}

export interface ClassifyingEvent extends BaseEvent {
  type: 'classifying';
  intent: LegalIntent | null;
  category: LegalCategory | null;
  needsResearch: boolean | null;
}

export interface RetrievingEvent extends BaseEvent {
  type: 'retrieving';
  evidenceCount: number;
}

export interface EvidenceEvaluatedEvent extends BaseEvent {
  type: 'evidence_evaluated';
  evidenceCount: number;
  evidence: Evidence[];
}

export interface GeneratingEvent extends BaseEvent {
  type: 'generating';
}

export interface VerifyingEvent extends BaseEvent {
  type: 'verifying';
  citationCount: number;
  confidence: number | null;
}

export interface CompletedEvent extends BaseEvent {
  type: 'completed';
  outcome: ResearchOutcome;
  confidence: number | null;
  citations: Citation[];
  evidence: Evidence[];
  summary: string | null;
  reasoning: string | null;
}

export interface FailedEvent extends BaseEvent {
  type: 'failed';
  message: string;
}

/** União discriminada de todos os eventos de pesquisa. */
export type ResearchEvent =
  | StartedEvent
  | ClassifyingEvent
  | RetrievingEvent
  | EvidenceEvaluatedEvent
  | GeneratingEvent
  | VerifyingEvent
  | CompletedEvent
  | FailedEvent;
