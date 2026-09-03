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
import { LocalEmbeddingsProvider } from './infrastructure/local-embeddings.provider';
import { RuleBasedLlmProvider } from './infrastructure/rule-based-llm.provider';
import { PgVectorRetrievalProvider } from './infrastructure/pgvector-retrieval.provider';

const llmProvider: Provider = {
  provide: LLM_PROVIDER,
  useFactory: (config: AppConfigService): LlmProvider => {
    if (config.aiProvider === 'huggingface' && config.hfApiToken) {
      return new HuggingFaceLlmProvider({
        apiToken: config.hfApiToken,
        model: config.hfModel,
        timeoutMs: config.hfTimeoutMs,
      });
    }
    return new RuleBasedLlmProvider();
  },
  inject: [AppConfigService],
};

const embeddingsProvider: Provider = {
  provide: EMBEDDINGS_PROVIDER,
  useFactory: (config: AppConfigService): EmbeddingsProvider => {
    if (config.aiProvider === 'huggingface' && config.hfApiToken) {
      return new HuggingFaceEmbeddingsProvider({
        apiToken: config.hfApiToken,
        model: config.hfEmbeddingsModel,
        timeoutMs: config.hfTimeoutMs,
      });
    }
    return new LocalEmbeddingsProvider();
  },
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
 * A escolha fake vs Hugging Face é feita por `AI_PROVIDER` (env).
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
