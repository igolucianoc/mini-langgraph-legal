'use client';

import { useState, type FormEvent } from 'react';
import { PrimaryButton, GhostButton } from '@/components/ui';
import { useAuth } from './auth-context';

/** Formulário de login/cadastro seguindo o DESIGN.md (canvas aubergine). */
export function LoginForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--spacing-24)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'grid',
          gap: 'var(--spacing-16)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--text-heading)',
            fontWeight: 500,
            letterSpacing: '-0.54px',
            textAlign: 'center',
          }}
        >
          Mini Legal Graph
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-pale-lilac)',
            marginTop: 'calc(-1 * var(--spacing-8))',
          }}
        >
          {mode === 'login' ? 'Entre para pesquisar' : 'Crie sua conta'}
        </p>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-body-sm)' }}>E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-body-sm)' }}>Senha</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-lime-spark)' }}>
            {error}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={submitting}>
          {submitting
            ? 'Enviando...'
            : mode === 'login'
              ? 'Entrar'
              : 'Cadastrar'}
        </PrimaryButton>

        <GhostButton
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Não tenho conta' : 'Já tenho conta'}
        </GhostButton>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  color: 'var(--color-ink)',
  border: 'none',
  borderRadius: 'var(--radius-inputs)',
  padding: '12px 16px',
  fontSize: 'var(--text-body)',
  fontFamily: 'var(--font-suisse-intl)',
};
