'use client';

import { useCallback, useRef, useState } from 'react';
import { apiBaseUrl } from '@/lib/api-client';
import type {
  Citation,
  Evidence,
  ResearchEvent,
  ResearchEventType,
  ResearchOutcome,
} from '@/lib/types';

export type StreamPhase =
  | 'idle'
  | 'streaming'
  | 'reconnecting'
  | 'completed'
  | 'error';

/** Passos do grafo exibidos na UI, na ordem do workflow. */
export const GRAPH_STEPS = [
  { key: 'classifying', label: 'Classificação' },
  { key: 'retrieving', label: 'Pesquisa' },
  { key: 'evidence_evaluated', label: 'Avaliação das evidências' },
  { key: 'generating', label: 'Geração' },
  { key: 'verifying', label: 'Verificação' },
] as const;

export type GraphStepKey = (typeof GRAPH_STEPS)[number]['key'];

export interface ResearchResult {
  outcome: ResearchOutcome;
  confidence: number | null;
  summary: string | null;
  reasoning: string | null;
  citations: Citation[];
  evidence: Evidence[];
}

export interface ResearchStreamState {
  phase: StreamPhase;
  currentStep: ResearchEventType | null;
  completedSteps: ResearchEventType[];
  evidence: Evidence[];
  result: ResearchResult | null;
  errorMessage: string | null;
}

const INITIAL: ResearchStreamState = {
  phase: 'idle',
  currentStep: null,
  completedSteps: [],
  evidence: [],
  result: null,
  errorMessage: null,
};

export function useResearchStream(accessToken: string | null) {
  const [state, setState] = useState<ResearchStreamState>(INITIAL);
  const sourceRef = useRef<EventSource | null>(null);

  const close = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  const start = useCallback(
    (question: string) => {
      if (!accessToken) {
        setState({ ...INITIAL, phase: 'error', errorMessage: 'Sessão expirada.' });
        return;
      }
      close();
      setState({ ...INITIAL, phase: 'streaming' });

      const url = new URL(`${apiBaseUrl()}/research/stream`);
      url.searchParams.set('token', accessToken);
      url.searchParams.set('question', question);
      const source = new EventSource(url.toString());
      sourceRef.current = source;

      const handle = (event: ResearchEvent): void => {
        setState((prev) => reduce(prev, event));
        if (event.type === 'completed' || event.type === 'failed') {
          close();
        }
      };

      const types: ResearchEventType[] = [
        'started',
        'classifying',
        'retrieving',
        'evidence_evaluated',
        'generating',
        'verifying',
        'completed',
        'failed',
      ];
      for (const type of types) {
        source.addEventListener(type, (msg) => {
          const data = JSON.parse((msg as MessageEvent<string>).data) as ResearchEvent;
          handle(data);
        });
      }

      source.onerror = () => {
        // EventSource tenta reconectar sozinho; refletimos isso na UI, mas se
        // a execução já terminou, ignoramos.
        setState((prev) => {
          if (prev.phase === 'completed' || prev.phase === 'error') {
            return prev;
          }
          return { ...prev, phase: 'reconnecting' };
        });
      };
    },
    [accessToken, close],
  );

  const reset = useCallback(() => {
    close();
    setState(INITIAL);
  }, [close]);

  return { state, start, reset };
}

function reduce(
  prev: ResearchStreamState,
  event: ResearchEvent,
): ResearchStreamState {
  switch (event.type) {
    case 'started':
      return { ...INITIAL, phase: 'streaming', currentStep: 'started' };
    case 'classifying':
    case 'retrieving':
    case 'generating':
    case 'verifying':
      return {
        ...prev,
        phase: 'streaming',
        currentStep: event.type,
        completedSteps: withCompleted(prev.completedSteps, prev.currentStep),
      };
    case 'evidence_evaluated':
      return {
        ...prev,
        phase: 'streaming',
        currentStep: 'evidence_evaluated',
        completedSteps: withCompleted(prev.completedSteps, prev.currentStep),
        evidence: event.evidence,
      };
    case 'completed':
      return {
        ...prev,
        phase: 'completed',
        currentStep: 'completed',
        completedSteps: withCompleted(prev.completedSteps, prev.currentStep),
        evidence: event.evidence,
        result: {
          outcome: event.outcome,
          confidence: event.confidence,
          summary: event.summary,
          reasoning: event.reasoning,
          citations: event.citations,
          evidence: event.evidence,
        },
      };
    case 'failed':
      return {
        ...prev,
        phase: 'error',
        currentStep: 'failed',
        errorMessage: event.message,
      };
    default:
      return prev;
  }
}

function withCompleted(
  completed: ResearchEventType[],
  step: ResearchEventType | null,
): ResearchEventType[] {
  if (!step || step === 'started' || completed.includes(step)) {
    return completed;
  }
  return [...completed, step];
}
