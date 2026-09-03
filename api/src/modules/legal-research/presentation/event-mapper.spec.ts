import { describe, expect, it } from 'vitest';
import { mapStateToEvent } from './event-mapper';
import type { LegalResearchState } from '../graph/legal-research.state';

function state(over: Partial<LegalResearchState>): LegalResearchState {
  return {
    question: 'q',
    correlationId: 'cid',
    intent: null,
    category: null,
    needsResearch: null,
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

describe('mapStateToEvent', () => {
  it('mapeia classifying com intenção e categoria', () => {
    const event = mapStateToEvent(
      state({ status: 'classifying', intent: 'requirements', category: 'CONTRACTS' }),
      'cid',
    );
    expect(event?.type).toBe('classifying');
  });

  it('mapeia retrieving com contagem de evidências', () => {
    const event = mapStateToEvent(
      state({
        status: 'retrieving',
        evidence: [
          {
            chunkId: 'a',
            documentId: 'd',
            title: 't',
            category: 'CONTRACTS',
            source: 's',
            snippet: 'x',
            score: 0.5,
          },
        ],
      }),
      'cid',
    );
    expect(event).toEqual(
      expect.objectContaining({ type: 'retrieving', evidenceCount: 1 }),
    );
  });

  it('retorna null para estados terminais (completed/failed)', () => {
    expect(mapStateToEvent(state({ status: 'completed' }), 'cid')).toBeNull();
    expect(mapStateToEvent(state({ status: 'failed' }), 'cid')).toBeNull();
  });

  it('mapeia verifying com contagem de citações', () => {
    const event = mapStateToEvent(
      state({ status: 'verifying', confidence: 0.7 }),
      'cid',
    );
    expect(event).toEqual(
      expect.objectContaining({ type: 'verifying', confidence: 0.7 }),
    );
  });
});
