import { Prisma } from '@prisma/client';
import { toPgVector } from '../../../shared/deterministic-embedding';
import type { PrismaService } from '../../../prisma/prisma.service';
import type {
  EmbeddingsProvider,
  RetrievalProvider,
  RetrievalQuery,
} from '../domain/contracts';
import type { Evidence, LegalCategory } from '../domain/legal.types';

interface ChunkRow {
  chunk_id: string;
  document_id: string;
  title: string;
  category: LegalCategory;
  source: string;
  content: string;
  distance: number;
}

/**
 * Retrieval por similaridade coseno via pgvector.
 *
 * Depende de um `EmbeddingsProvider` (contrato) para vetorizar a pergunta e do
 * PrismaService para a query. Converte distância coseno (`<=>`) em score de
 * similaridade (1 - distância) e aplica threshold e top-k.
 */
export class PgVectorRetrievalProvider implements RetrievalProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsProvider,
  ) {}

  async search(query: RetrievalQuery): Promise<Evidence[]> {
    const [embedding] = await this.embeddings.embed([query.question]);
    if (!embedding) {
      return [];
    }
    const vector = toPgVector(embedding);

    // topK é numérico e controlado internamente; categoria é parametrizada.
    const categoryFilter = query.category
      ? Prisma.sql`AND d.category = ${query.category}::"LegalCategory"`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      SELECT
        c.id AS chunk_id,
        d.id AS document_id,
        d.title AS title,
        d.category AS category,
        d.source AS source,
        c.content AS content,
        (c.embedding <=> ${vector}::vector) AS distance
      FROM legal_document_chunks c
      JOIN legal_documents d ON d.id = c."documentId"
      WHERE c.embedding IS NOT NULL
      ${categoryFilter}
      ORDER BY distance ASC
      LIMIT ${query.topK}
    `);

    return rows
      .map((row) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        title: row.title,
        category: row.category,
        source: row.source,
        snippet: row.content,
        score: 1 - Number(row.distance),
      }))
      .filter((evidence) => evidence.score >= query.threshold);
  }
}
