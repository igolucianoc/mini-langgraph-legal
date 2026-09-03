import { embedText } from '../../../shared/deterministic-embedding';
import type {
  RetrievalProvider,
  RetrievalQuery,
} from '../domain/contracts';
import type { Evidence, LegalCategory } from '../domain/legal.types';

/** Documento em memória usado pelo fake provider. */
export interface FakeCorpusChunk {
  chunkId: string;
  documentId: string;
  title: string;
  category: LegalCategory;
  source: string;
  content: string;
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieval determinístico em memória, sem banco nem rede.
 *
 * Usa o mesmo embedding determinístico do seed e ranqueia por similaridade
 * coseno. É a base dos testes do grafo e do modo `AI_PROVIDER=fake`.
 */
export class FakeRetrievalProvider implements RetrievalProvider {
  private readonly indexed: ReadonlyArray<{
    chunk: FakeCorpusChunk;
    embedding: number[];
  }>;

  constructor(corpus: readonly FakeCorpusChunk[]) {
    this.indexed = corpus.map((chunk) => ({
      chunk,
      embedding: embedText(`${chunk.title}. ${chunk.content}`),
    }));
  }

  async search(query: RetrievalQuery): Promise<Evidence[]> {
    const queryEmbedding = embedText(query.question);

    const scored = this.indexed
      .filter(
        ({ chunk }) =>
          query.category === null || chunk.category === query.category,
      )
      .map(({ chunk, embedding }) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, embedding),
      }))
      .filter((item) => item.score >= query.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK);

    return scored.map(({ chunk, score }) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      title: chunk.title,
      category: chunk.category,
      source: chunk.source,
      snippet: chunk.content,
      score,
    }));
  }
}
