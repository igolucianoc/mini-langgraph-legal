import { describe, expect, it } from 'vitest';
import {
  routeAfterDecision,
  routeAfterEvaluation,
  routeAfterVerification,
} from './routing';
import { DEFAULT_EVIDENCE_POLICY } from '../../domain/evidence-policy';
import type { LegalResearchState } from '../legal-research.state';
import type { Evidence } from '../../domain/legal.types';

function baseState(over: Partial<LegalResearchState> = {}): LegalResearchState {
  return {
    question: 'pergunta',
    correlationId: 'cid',
    intent: 'requirements',
    category: 'CONTRACTS',
    needsResearch: true,
    evidence: [],
    analysis: null,
    citations: [],
    confidence: null,
    attempt: 1,
    maxAttempts: 2,
    status: 'started',
    outcome: null,
    error: null,
    ...over,
  };
}

function strongEvidence(): Evidence[] {
  return [
    {
      chunkId: 'a',
      documentId: 'd',
      title: 't',
      category: 'CONTRACTS',
      source: 's',
      snippet: 'x',
      score: 0.9,
    },
    {
      chunkId: 'b',
      documentId: 'd',
      title: 't',
      category: 'CONTRACTS',
      source: 's',
      snippet: 'y',
      score: 0.8,
    },
  ];
}

describe('routeAfterDecision', () => {
  it('vai para direct_answer quando needsResearch é false', () => {
    expect(routeAfterDecision(baseState({ needsResearch: false }))).toBe(
      'direct_answer',
    );
  });

  it('vai para research quando needsResearch é true', () => {
    expect(routeAfterDecision(baseState({ needsResearch: true }))).toBe(
      'research',
    );
  });
});

describe('routeAfterEvaluation', () => {
  it('sufficient quando há evidência forte com cobertura', () => {
    const route = routeAfterEvaluation(
      baseState({ evidence: strongEvidence() }),
      DEFAULT_EVIDENCE_POLICY,
    );
    expect(route).toBe('sufficient');
  });

  it('insufficient quando não há evidência suficiente', () => {
    const route = routeAfterEvaluation(
      baseState({ evidence: [] }),
      DEFAULT_EVIDENCE_POLICY,
    );
    expect(route).toBe('insufficient');
  });
});

describe('routeAfterVerification', () => {
  it('accept quando há citações e confiança positiva', () => {
    const state = baseState({
      citations: [
        {
          documentId: 'd',
          chunkId: 'a',
          title: 't',
          category: 'CONTRACTS',
          snippet: 'x',
          score: 0.9,
        },
      ],
      confidence: 0.7,
    });
    expect(routeAfterVerification(state)).toBe('accept');
  });

  it('retry quando rejeitado e ainda há tentativas', () => {
    const state = baseState({
      citations: [],
      confidence: 0,
      attempt: 1,
      maxAttempts: 2,
    });
    expect(routeAfterVerification(state)).toBe('retry');
  });

  it('insufficient quando rejeitado e sem tentativas restantes', () => {
    const state = baseState({
      citations: [],
      confidence: 0,
      attempt: 2,
      maxAttempts: 2,
    });
    expect(routeAfterVerification(state)).toBe('insufficient');
  });
});
