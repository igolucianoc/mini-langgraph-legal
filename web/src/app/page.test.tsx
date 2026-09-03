import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('exibe o título do projeto', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /mini legal graph/i }),
    ).toBeInTheDocument();
  });

  it('exibe o aviso de uso educacional', () => {
    render(<HomePage />);

    expect(
      screen.getByText(/não constitui aconselhamento jurídico/i),
    ).toBeInTheDocument();
  });
});
