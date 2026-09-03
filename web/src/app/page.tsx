'use client';

import { useAuth } from '@/features/auth/auth-context';
import { LoginForm } from '@/features/auth/login-form';
import { ResearchView } from '@/features/research/research-view';

export default function HomePage() {
  const { accessToken, initializing } = useAuth();

  if (initializing) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--color-pale-lilac)' }}>Carregando...</p>
      </main>
    );
  }

  return accessToken ? <ResearchView /> : <LoginForm />;
}
