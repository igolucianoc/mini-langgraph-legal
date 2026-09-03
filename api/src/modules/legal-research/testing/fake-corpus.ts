import { seedDocuments } from '../../../../prisma/seed-data';
import type { FakeCorpusChunk } from '../infrastructure/fake-retrieval.provider';
import type { LegalCategory } from '../domain/legal.types';

/**
 * Corpus determinístico em memória, derivado do mesmo seed usado no banco.
 * Serve para testes do retrieval e do grafo sem depender de Postgres.
 */
export function buildFakeCorpus(): FakeCorpusChunk[] {
  const chunks: FakeCorpusChunk[] = [];
  for (const doc of seedDocuments) {
    doc.chunks.forEach((content, ordinal) => {
      chunks.push({
        chunkId: `${doc.slug}#${ordinal}`,
        documentId: doc.slug,
        title: doc.title,
        category: doc.category as LegalCategory,
        source: doc.source,
        content,
      });
    });
  }
  return chunks;
}
