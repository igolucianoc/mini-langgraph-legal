import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini Legal Graph',
  description:
    'Assistente de triagem jurídica educacional demonstrando LangGraph. Não oferece aconselhamento jurídico profissional.',
};

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
