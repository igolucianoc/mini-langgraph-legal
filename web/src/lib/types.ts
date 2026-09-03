/** Tipos compartilhados com o backend (espelham os contratos da API). */

export type LegalCategory =
  | 'CONTRACTS'
  | 'DEFAULT_BREACH'
  | 'CIVIL_LIABILITY'
  | 'CIVIL_PROCEDURE'
  | 'CONSUMER';

export type LegalIntent =
  | 'explain_concept'
  | 'procedure'
  | 'rights_obligations'
  | 'requirements'
  | 'out_of_scope';

export type ResearchOutcome =
  | 'ANSWERED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'DIRECT_ANSWER'
  | 'FAILED';

export type ResearchEventType =
  | 'started'
  | 'classifying'
  | 'retrieving'
  | 'evidence_evaluated'
  | 'generating'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface Evidence {
  chunkId: string;
  documentId: string;
  title: string;
  category: LegalCategory;
  source: string;
  snippet: string;
  score: number;
}

export interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  category: LegalCategory;
  snippet: string;
  score: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface HistoryItem {
  id: string;
  question: string;
  category: LegalCategory | null;
  createdAt: string;
  lastExecution: {
    correlationId: string;
    status: string;
    outcome: ResearchOutcome | null;
    confidence: number | null;
    createdAt: string;
  } | null;
}

/** Eventos SSE recebidos do backend. */
export interface StartedEvent {
  type: 'started';
  correlationId: string;
  attempt: number;
  question: string;
}
export interface ClassifyingEvent {
  type: 'classifying';
  correlationId: string;
  attempt: number;
  intent: LegalIntent | null;
  category: LegalCategory | null;
  needsResearch: boolean | null;
}
export interface RetrievingEvent {
  type: 'retrieving';
  correlationId: string;
  attempt: number;
  evidenceCount: number;
}
export interface EvidenceEvaluatedEvent {
  type: 'evidence_evaluated';
  correlationId: string;
  attempt: number;
  evidenceCount: number;
  evidence: Evidence[];
}
export interface GeneratingEvent {
  type: 'generating';
  correlationId: string;
  attempt: number;
}
export interface VerifyingEvent {
  type: 'verifying';
  correlationId: string;
  attempt: number;
  citationCount: number;
  confidence: number | null;
}
export interface CompletedEvent {
  type: 'completed';
  correlationId: string;
  attempt: number;
  outcome: ResearchOutcome;
  confidence: number | null;
  citations: Citation[];
  evidence: Evidence[];
  summary: string | null;
  reasoning: string | null;
}
export interface FailedEvent {
  type: 'failed';
  correlationId: string;
  attempt: number;
  message: string;
}

export type ResearchEvent =
  | StartedEvent
  | ClassifyingEvent
  | RetrievingEvent
  | EvidenceEvaluatedEvent
  | GeneratingEvent
  | VerifyingEvent
  | CompletedEvent
  | FailedEvent;
