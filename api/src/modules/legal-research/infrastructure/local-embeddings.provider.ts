import { embedText } from '../../../shared/deterministic-embedding';
import type { EmbeddingsProvider } from '../domain/contracts';

/**
 * Embeddings determinísticos locais (mesmo algoritmo do seed). Usado no modo
 * `AI_PROVIDER=fake` para permitir retrieval real contra o Postgres sem rede.
 */
export class LocalEmbeddingsProvider implements EmbeddingsProvider {
  async embed(texts: readonly string[]): Promise<number[][]> {
    return texts.map((text) => embedText(text));
  }
}
