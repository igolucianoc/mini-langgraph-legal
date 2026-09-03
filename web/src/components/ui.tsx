'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Botão primário lime — a única CTA de destaque por tela (DESIGN.md). */
export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: 'var(--color-lime-spark)',
        color: 'var(--color-midnight-navy)',
        border: 'none',
        borderRadius: 'var(--radius-buttons)',
        padding: '12px 24px',
        fontFamily: 'var(--font-suisse-intl)',
        fontWeight: 500,
        fontSize: 'var(--text-body)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Botão fantasma (secundário) com borda lilás sobre superfície escura. */
export function GhostButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: 'transparent',
        color: '#ffffff',
        border: '1px solid var(--color-pale-lilac)',
        borderRadius: 'var(--radius-buttons)',
        padding: '10px 20px',
        fontFamily: 'var(--font-suisse-intl)',
        fontWeight: 500,
        fontSize: 'var(--text-body)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Cartão claro (Lilac Mist) flutuando sobre o canvas aubergine. */
export function Card({
  children,
  tone = 'lilac',
}: {
  readonly children: ReactNode;
  readonly tone?: 'lilac' | 'plum';
}) {
  const background =
    tone === 'plum' ? 'var(--color-royal-plum)' : 'var(--surface-lilac-mist)';
  const color = tone === 'plum' ? '#ffffff' : 'var(--color-ink)';
  return (
    <div
      style={{
        background,
        color,
        borderRadius: 'var(--radius-cards)',
        padding: 'var(--card-padding)',
      }}
    >
      {children}
    </div>
  );
}
