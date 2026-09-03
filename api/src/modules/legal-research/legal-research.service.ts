import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ANSWER_VERIFIER,
  LLM_PROVIDER,
  RETRIEVAL_PROVIDER,
  type AnswerVerifier,
  type LlmProvider,
  type RetrievalProvider,
} from './domain/contracts';
import { DEFAULT_EVIDENCE_POLICY } from './domain/evidence-policy';
import { buildLegalResearchGraph } from './graph/legal-research.graph';
import type { LegalResearchState } from './graph/legal-research.state';
import type { NodeContext } from './graph/nodes/node-context';
import { mapStateToEvent } from './presentation/event-mapper';
import type { ResearchEvent } from './presentation/research-events';
import { ResearchObservability } from '../../shared/observability';

export interface RunResearchInput {
  userId: string;
  question: string;
}

/**
 * Orquestra a execução do grafo: monta o contexto com os providers injetados,
 * roda o LangGraph em modo streaming, emite eventos tipados e persiste a
 * execução (query, execução, citações) para observabilidade e histórico.
 */
@Injectable()
export class LegalResearchService {
  private readonly observability = new ResearchObservability();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(RETRIEVAL_PROVIDER) private readonly retrieval: RetrievalProvider,
    @Inject(ANSWER_VERIFIER) private readonly verifier: AnswerVerifier,
  ) {}

  private buildContext(): NodeContext {
    return {
      llm: this.llm,
      retrieval: this.retrieval,
      verifier: this.verifier,
      retrievalTopK: this.config.retrievalTopK,
      retrievalThreshold: this.config.retrievalThreshold,
      evidencePolicy: DEFAULT_EVIDENCE_POLICY,
    };
  }

  /**
   * Executa a pesquisa como um stream de eventos. Persiste o estado inicial e o
   * final. Erros são convertidos em um evento `failed` (mensagem segura).
   */
  async *run(input: RunResearchInput): AsyncGenerator<ResearchEvent> {
    const correlationId = randomUUID();
    const startedAt = Date.now();

    const query = await this.prisma.researchQuery.create({
      data: { userId: input.userId, question: input.question },
    });
    const execution = await this.prisma.researchExecution.create({
      data: {
        queryId: query.id,
        correlationId,
        status: 'STARTED',
        model: this.llm.modelName,
      },
    });

    yield {
      type: 'started',
      correlationId,
      attempt: 0,
      question: input.question,
    };

    let lastState: LegalResearchState | null = null;

    try {
      const graph = buildLegalResearchGraph(this.buildContext());
      // streamMode 'values' entrega o estado completo acumulado a cada passo.
      const stream = await graph.stream(
        { question: input.question, correlationId },
        { recursionLimit: 25, streamMode: 'values' },
      );

      let previousStatus: LegalResearchState['status'] | null = null;
      for await (const state of stream) {
        lastState = state;
        // Só emite quando o status muda, evitando eventos duplicados.
        if (state.status !== previousStatus) {
          previousStatus = state.status;
          this.observability.event({
            correlationId,
            model: this.llm.modelName,
            node: state.status,
            evidenceCount: state.evidence.length,
            attempts: state.attempt,
          });
          const event = mapStateToEvent(state, correlationId);
          if (event) {
            yield event;
          }
        }
      }

      if (!lastState) {
        throw new Error('Execução do grafo não produziu estado.');
      }

      await this.persistSuccess(query.id, execution.id, lastState, startedAt);
      this.observability.event({
        correlationId,
        model: this.llm.modelName,
        durationMs: Date.now() - startedAt,
        evidenceCount: lastState.evidence.length,
        attempts: lastState.attempt,
        outcome: lastState.outcome ?? 'UNKNOWN',
      });
      yield this.buildCompletedEvent(lastState, correlationId);
    } catch (error) {
      const message = this.safeErrorMessage(error);
      this.observability.failure(correlationId, this.llm.modelName, message);
      await this.persistFailure(execution.id, message, startedAt);
      yield {
        type: 'failed',
        correlationId,
        attempt: lastState?.attempt ?? 0,
        message,
      };
    }
  }

  private buildCompletedEvent(
    state: LegalResearchState,
    correlationId: string,
  ): ResearchEvent {
    return {
      type: 'completed',
      correlationId,
      attempt: state.attempt,
      outcome: state.outcome ?? 'FAILED',
      confidence: state.confidence,
      citations: state.citations,
      evidence: state.evidence,
      summary: state.analysis?.summary ?? null,
      reasoning: state.analysis?.reasoning ?? null,
    };
  }

  private async persistSuccess(
    queryId: string,
    executionId: string,
    state: LegalResearchState,
    startedAt: number,
  ): Promise<void> {
    await this.prisma.researchQuery.update({
      where: { id: queryId },
      data: { intent: state.intent, category: state.category },
    });
    await this.prisma.researchExecution.update({
      where: { id: executionId },
      data: {
        status: state.status === 'failed' ? 'FAILED' : 'COMPLETED',
        outcome: state.outcome,
        confidence: state.confidence,
        attempts: state.attempt,
        evidenceCount: state.evidence.length,
        analysis: state.analysis?.summary ?? null,
        latencyMs: Date.now() - startedAt,
      },
    });

    if (state.citations.length > 0) {
      await this.prisma.researchCitation.createMany({
        data: state.citations.map((citation) => ({
          executionId,
          chunkId: citation.chunkId,
          score: citation.score,
          snippet: citation.snippet,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async persistFailure(
    executionId: string,
    message: string,
    startedAt: number,
  ): Promise<void> {
    await this.prisma.researchExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        outcome: 'FAILED',
        error: message,
        latencyMs: Date.now() - startedAt,
      },
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Erro inesperado na execução da pesquisa.';
  }
}
