import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraphProgress } from './graph-progress';

describe('GraphProgress', () => {
  it('exibe todos os passos do grafo', () => {
    render(<GraphProgress currentStep={null} completedSteps={[]} />);

    expect(screen.getByText('Classificação')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('Avaliação das evidências')).toBeInTheDocument();
    expect(screen.getByText('Geração')).toBeInTheDocument();
    expect(screen.getByText('Verificação')).toBeInTheDocument();
  });

  it('marca o passo atual com aria-current', () => {
    render(
      <GraphProgress currentStep="retrieving" completedSteps={['classifying']} />,
    );

    const current = screen.getByText('Pesquisa').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });
});
