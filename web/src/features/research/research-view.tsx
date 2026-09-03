'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card, GhostButton, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { clearHistory, fetchHistory } from '@/lib/api-client';
import type { HistoryItem } from '@/lib/types';
import { GraphProgress } from './graph-progress';
import { ResultPanel } from './result-panel';
import { useResearchStream } from './use-research-stream';
import { categoryLabel } from './labels';

const EXAMPLES = [
  'Quais são os requisitos para uma cobrança judicial de uma dívida contratual?',
  'O que caracteriza o inadimplemento de uma obrigação?',
  'Quais direitos o consumidor tem diante de um vício do produto?',
];

export function ResearchView() {
  const { accessToken, logout } = useAuth();
  const { state, start, reset } = useResearchStream(accessToken);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [clearing, setClearing] = useState(false);

  const loadHistory = (): void => {
    if (!accessToken) {
      return;
    }
    fetchHistory(accessToken)
      .then(setHistory)
      .catch(() => undefined);
  };

  function handleClearHistory(): void {
    if (!accessToken || clearing) {
      return;
    }
    setClearing(true);
    clearHistory(accessToken)
      .then(() => setHistory([]))
      .catch(() => undefined)
      .finally(() => setClearing(false));
  }

  useEffect(loadHistory, [accessToken]);

  // Recarrega o histórico ao concluir uma execução.
  useEffect(() => {
    if (state.phase === 'completed') {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (question.trim().length >= 8) {
      start(question.trim());
    }
  }

  const busy = state.phase === 'streaming' || state.phase === 'reconnecting';

  return (
    <div style={{ maxWidth: 'var(--page-max-width)', margin: '0 auto', padding: 'var(--spacing-24)' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-32)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-heading-sm)', fontWeight: 500 }}>
          Mini Legal Graph
        </h1>
        <GhostButton type="button" onClick={() => void logout()}>
          Sair
        </GhostButton>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 'var(--spacing-24)',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        }}
      >
        <section style={{ display: 'grid', gap: 'var(--spacing-24)', alignContent: 'start' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-8)' }}>
            <label htmlFor="question" style={{ fontSize: 'var(--text-body-sm)' }}>
              Sua pergunta jurídica (educacional)
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="Ex.: requisitos para cobrança de dívida contratual"
              style={{
                background: '#ffffff',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: 'var(--radius-inputs)',
                padding: '12px 16px',
                fontFamily: 'var(--font-suisse-intl)',
                fontSize: 'var(--text-body)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-8)' }}>
              <PrimaryButton type="submit" disabled={busy || question.trim().length < 8}>
                {busy ? 'Executando...' : 'Pesquisar'}
              </PrimaryButton>
              {state.phase !== 'idle' ? (
                <GhostButton type="button" onClick={reset} disabled={busy}>
                  Limpar
                </GhostButton>
              ) : null}
            </div>
          </form>

          {state.phase === 'idle' ? (
            <Card tone="plum">
              <h3 style={{ fontWeight: 500 }}>Exemplos de perguntas</h3>
              <ul style={{ marginTop: 'var(--spacing-8)', paddingLeft: 18 }}>
                {EXAMPLES.map((example) => (
                  <li key={example} style={{ marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => setQuestion(example)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-lime-spark)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                        fontFamily: 'var(--font-suisse-intl)',
                        fontSize: 'var(--text-body-sm)',
                      }}
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {state.phase === 'reconnecting' ? (
            <p role="status" style={{ color: 'var(--color-lavender-glow)' }}>
              Reconectando ao fluxo de execução...
            </p>
          ) : null}

          {state.phase === 'error' ? (
            <Card>
              <h3 style={{ fontWeight: 500, color: 'var(--color-ink)' }}>
                Erro na execução
              </h3>
              <p style={{ color: 'var(--color-slate)', marginTop: 'var(--spacing-8)' }}>
                {state.errorMessage ?? 'Não foi possível concluir a pesquisa.'}
              </p>
            </Card>
          ) : null}

          {state.result ? <ResultPanel result={state.result} /> : null}

          <p style={{ color: 'var(--color-ash)', fontSize: 'var(--text-caption)' }}>
            Projeto educacional. Não constitui aconselhamento jurídico profissional.
          </p>
        </section>

        <aside style={{ display: 'grid', gap: 'var(--spacing-24)', alignContent: 'start' }}>
          {state.phase !== 'idle' ? (
            <Card tone="plum">
              <h3 style={{ fontWeight: 500, marginBottom: 'var(--spacing-8)' }}>
                Execução do grafo
              </h3>
              <GraphProgress
                currentStep={state.currentStep}
                completedSteps={state.completedSteps}
              />
            </Card>
          ) : null}

          <Card tone="plum">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-8)',
              }}
            >
              <h3 style={{ fontWeight: 500 }}>Histórico</h3>
              {history.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={clearing}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-pale-lilac)',
                    cursor: clearing ? 'not-allowed' : 'pointer',
                    opacity: clearing ? 0.6 : 1,
                    padding: 0,
                    fontFamily: 'var(--font-suisse-intl)',
                    fontSize: 'var(--text-caption)',
                    textDecoration: 'underline',
                  }}
                >
                  {clearing ? 'Limpando...' : 'Limpar histórico'}
                </button>
              ) : null}
            </div>
            {history.length === 0 ? (
              <p style={{ color: 'var(--color-pale-lilac)', fontSize: 'var(--text-body-sm)' }}>
                Nenhuma pesquisa ainda.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--spacing-8)' }}>
                {history.map((item) => (
                  <li key={item.id} style={{ fontSize: 'var(--text-body-sm)' }}>
                    <button
                      type="button"
                      onClick={() => setQuestion(item.question)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                        fontFamily: 'var(--font-suisse-intl)',
                      }}
                    >
                      {item.question}
                    </button>
                    <span
                      style={{
                        display: 'block',
                        color: 'var(--color-pale-lilac)',
                        fontSize: 'var(--text-caption)',
                      }}
                    >
                      {categoryLabel(item.category)} ·{' '}
                      {item.lastExecution?.outcome ?? 'pendente'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
