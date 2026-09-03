import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultPanel } from './result-panel';
import type { ResearchResult } from './use-research-stream';

const answered: ResearchResult = {
  outcome: 'ANSWERED',
  confidence: 0.61,
  summary: 'Orientação educacional resumida.',
  reasoning: 'Fundamentação.',
  citations: [
    {
      documentId: 'd1',
      chunkId: 'c1',
      title: 'Requisitos para cobrança',
      category: 'CONTRACTS',
      snippet: 'trecho citado',
      score: 0.7,
    },
  ],
  evidence: [],
};

describe('ResultPanel', () => {
  it('mostra a orientação, confiança e fontes quando ANSWERED', () => {
    render(<ResultPanel result={answered} />);

    expect(
      screen.getByRole('heading', { name: /orientação educacional/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/61%/)).toBeInTheDocument();
    expect(screen.getByText('Requisitos para cobrança')).toBeInTheDocument();
    expect(screen.getByText('trecho citado')).toBeInTheDocument();
  });

  it('mostra aviso explícito quando a evidência é insuficiente', () => {
    render(
      <ResultPanel
        result={{ ...answered, outcome: 'INSUFFICIENT_EVIDENCE', citations: [] }}
      />,
    );

    expect(screen.getByText(/evidência insuficiente/i)).toBeInTheDocument();
    expect(screen.queryByText('Requisitos para cobrança')).not.toBeInTheDocument();
  });

  it('mostra mensagem de fora de escopo para DIRECT_ANSWER', () => {
    render(<ResultPanel result={{ ...answered, outcome: 'DIRECT_ANSWER' }} />);

    expect(screen.getByText(/fora do escopo/i)).toBeInTheDocument();
  });
});
