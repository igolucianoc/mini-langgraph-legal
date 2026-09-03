import { Logger } from '@nestjs/common';

/**
 * Campos observáveis de uma execução do grafo. Deliberadamente NÃO inclui
 * tokens, secrets, o texto de prompts sensíveis ou conteúdo desnecessário —
 * apenas metadados úteis para diagnóstico.
 */
export interface ExecutionObservation {
  correlationId: string;
  model: string;
  node?: string;
  durationMs?: number;
  evidenceCount?: number;
  attempts?: number;
  outcome?: string;
  error?: string;
}

/**
 * Logger de observabilidade da pesquisa. Emite logs estruturados por
 * correlationId. Centraliza o cuidado de nunca vazar dados sensíveis.
 */
export class ResearchObservability {
  private readonly logger = new Logger('ResearchExecution');

  event(observation: ExecutionObservation): void {
    const { correlationId, node, ...rest } = observation;
    const details = Object.entries(rest)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' ');
    const prefix = node ? `[${correlationId}] node=${node}` : `[${correlationId}]`;
    this.logger.log(`${prefix} ${details}`.trim());
  }

  failure(correlationId: string, model: string, error: string): void {
    this.logger.error(`[${correlationId}] model=${model} error=${error}`);
  }
}
