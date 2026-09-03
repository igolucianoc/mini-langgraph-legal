'use client';

import { GRAPH_STEPS } from './use-research-stream';
import type { ResearchEventType } from '@/lib/types';

interface GraphProgressProps {
  readonly currentStep: ResearchEventType | null;
  readonly completedSteps: ResearchEventType[];
}

/**
 * Indicador visual do workflow LangGraph. Torna o grafo compreensível:
 * ✓ concluído, ● em execução, ○ pendente.
 */
export function GraphProgress({
  currentStep,
  completedSteps,
}: GraphProgressProps) {
  return (
    <ol
      aria-label="Progresso da execução do grafo"
      style={{ listStyle: 'none', display: 'grid', gap: 'var(--spacing-8)' }}
    >
      {GRAPH_STEPS.map((step) => {
        const done = completedSteps.includes(step.key) || currentStep === 'completed';
        const active = currentStep === step.key;
        const symbol = done ? '✓' : active ? '●' : '○';
        const color = done
          ? 'var(--color-lime-spark)'
          : active
            ? '#ffffff'
            : 'var(--color-ash)';
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-8)',
              color,
              fontSize: 'var(--text-body)',
            }}
          >
            <span aria-hidden style={{ width: 16 }}>
              {symbol}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
