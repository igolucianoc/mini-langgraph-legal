import { Module, type Provider } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ANSWER_VERIFIER,
  EMBEDDINGS_PROVIDER,
  LLM_PROVIDER,
  RETRIEVAL_PROVIDER,
  type EmbeddingsProvider,
  type LlmProvider,
} from './domain/contracts';
import { DeterministicAnswerVerifier } from './domain/answer-verifier';
import { HuggingFaceLlmProvider } from './infrastructure/huggingface/huggingface-llm.provider';
import { HuggingFaceEmbeddingsProvider } from './infrastructure/huggingface/huggingface-embeddings.provider';
import { PgVectorRetrievalProvider } from './infrastructure/pgvector-retrieval.provider';

const llmProvider: Provider = {
  provide: LLM_PROVIDER,
  useFactory: (config: AppConfigService): LlmProvider =>
    new HuggingFaceLlmProvider({
      apiToken: config.hfApiToken,
      model: config.hfModel,
      timeoutMs: config.hfTimeoutMs,
    }),
  inject: [AppConfigService],
};

const embeddingsProvider: Provider = {
  provide: EMBEDDINGS_PROVIDER,
  useFactory: (config: AppConfigService): EmbeddingsProvider =>
    new HuggingFaceEmbeddingsProvider({
      apiToken: config.hfApiToken,
      model: config.hfEmbeddingsModel,
      timeoutMs: config.hfTimeoutMs,
    }),
  inject: [AppConfigService],
};

const retrievalProvider: Provider = {
  provide: RETRIEVAL_PROVIDER,
  useFactory: (prisma: PrismaService, embeddings: EmbeddingsProvider) =>
    new PgVectorRetrievalProvider(prisma, embeddings),
  inject: [PrismaService, EMBEDDINGS_PROVIDER],
};

const answerVerifier: Provider = {
  provide: ANSWER_VERIFIER,
  useClass: DeterministicAnswerVerifier,
};

/**
 * Fornece os adapters concretos por trás dos contratos do domínio.
 * Toda IA (LLM e embeddings) é servida pela Hugging Face; não há fallback fake
 * em runtime. O `HF_API_TOKEN` é obrigatório (validado no boot).
 */
@Module({
  providers: [llmProvider, embeddingsProvider, retrievalProvider, answerVerifier],
  exports: [
    LLM_PROVIDER,
    EMBEDDINGS_PROVIDER,
    RETRIEVAL_PROVIDER,
    ANSWER_VERIFIER,
  ],
})
export class LegalProvidersModule {}
