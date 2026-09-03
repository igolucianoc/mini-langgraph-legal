import { Logger } from '@nestjs/common';
import type { EmbeddingsProvider } from '../../domain/contracts';

export interface HuggingFaceEmbeddingsConfig {
  apiToken: string;
  model: string;
  timeoutMs: number;
}

/**
 * Adapter de embeddings sobre a feature-extraction da Hugging Face. Contrato
 * independente do SDK; nunca loga o token.
 */
export class HuggingFaceEmbeddingsProvider implements EmbeddingsProvider {
  private readonly logger = new Logger(HuggingFaceEmbeddingsProvider.name);

  constructor(private readonly config: HuggingFaceEmbeddingsConfig) {}

  async embed(texts: readonly string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${this.config.model}/pipeline/feature-extraction`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: texts }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        this.logger.error(
          `Falha em embeddings Hugging Face (status ${response.status}).`,
        );
        throw new Error(`Hugging Face embeddings status ${response.status}.`);
      }

      const data: unknown = await response.json();
      return this.normalizeEmbeddings(data, texts.length);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Tempo limite excedido ao gerar embeddings.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Aceita tanto `number[][]` quanto `number[]` (texto único). */
  private normalizeEmbeddings(data: unknown, expected: number): number[][] {
    if (!Array.isArray(data)) {
      throw new Error('Formato inesperado de embeddings.');
    }
    if (expected === 1 && typeof data[0] === 'number') {
      return [data as number[]];
    }
    return data as number[][];
  }
}
