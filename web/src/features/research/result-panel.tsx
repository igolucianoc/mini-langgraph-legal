'use client';

import { Card } from '@/components/ui';
import { categoryLabel, confidenceLabel } from './labels';
import type { ResearchResult } from './use-research-stream';

/** Painel de resultado final, com tratamento explícito de cada outcome. */
export function ResultPanel({ result }: { readonly result: ResearchResult }) {
  if (result.outcome === 'INSUFFICIENT_EVIDENCE') {
    return (
      <Card>
        <h3 style={{ fontWeight: 500, fontSize: 'var(--text-subheading)' }}>
          Evidência insuficiente
        </h3>
        <p style={{ marginTop: 'var(--spacing-8)', color: 'var(--color-slate)' }}>
          A base documental fictícia não tem material suficiente para uma
          orientação segura sobre esta pergunta. Para evitar respostas sem
          fundamento, nada foi inventado.
        </p>
      </Card>
    );
  }

  if (result.outcome === 'DIRECT_ANSWER') {
    return (
      <Card>
        <h3 style={{ fontWeight: 500, fontSize: 'var(--text-subheading)' }}>
          Fora do escopo de pesquisa
        </h3>
        <p style={{ marginTop: 'var(--spacing-8)', color: 'var(--color-slate)' }}>
          Esta pergunta não exigiu consulta à base documental jurídica.
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-16)' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 'var(--spacing-16)',
          }}
        >
          <h3 style={{ fontWeight: 500, fontSize: 'var(--text-subheading)' }}>
            Orientação educacional
          </h3>
          <span
            style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-slate)' }}
          >
            Confiança: {confidenceLabel(result.confidence)}
          </span>
        </div>
        <p style={{ marginTop: 'var(--spacing-8)' }}>{result.summary}</p>
        {result.reasoning ? (
          <p
            style={{
              marginTop: 'var(--spacing-8)',
              color: 'var(--color-slate)',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            {result.reasoning}
          </p>
        ) : null}
      </Card>

      {result.citations.length > 0 ? (
        <Card>
          <h4 style={{ fontWeight: 500 }}>Fontes citadas</h4>
          <ul style={{ marginTop: 'var(--spacing-8)', paddingLeft: 18 }}>
            {result.citations.map((citation) => (
              <li key={citation.chunkId} style={{ marginBottom: 'var(--spacing-8)' }}>
                <strong>{citation.title}</strong>{' '}
                <span style={{ color: 'var(--color-slate)' }}>
                  ({categoryLabel(citation.category)})
                </span>
                <p
                  style={{
                    color: 'var(--color-slate)',
                    fontSize: 'var(--text-body-sm)',
                  }}
                >
                  {citation.snippet}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
