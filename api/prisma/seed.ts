/**
 * Seed determinístico — sem LLM e sem chamadas externas.
 *
 * Popula a base documental jurídica fictícia. Embeddings são gerados localmente
 * pela função determinística `embedText`, o que torna o seed reproduzível.
 */
import { PrismaClient } from '@prisma/client';
import { embedText, toPgVector } from '../src/shared/deterministic-embedding';
import { seedDocuments } from './seed-data';

const prisma = new PrismaClient();

async function resetLegalBase(): Promise<void> {
  // Ordem respeita as FKs (citations -> executions -> queries; chunks -> documents).
  await prisma.researchCitation.deleteMany();
  await prisma.researchExecution.deleteMany();
  await prisma.researchQuery.deleteMany();
  await prisma.legalDocumentChunk.deleteMany();
  await prisma.legalDocument.deleteMany();
}

async function main(): Promise<void> {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  await resetLegalBase();

  let documentCount = 0;
  let chunkCount = 0;

  for (const doc of seedDocuments) {
    const created = await prisma.legalDocument.create({
      data: {
        slug: doc.slug,
        title: doc.title,
        category: doc.category,
        source: doc.source,
        summary: doc.summary,
      },
    });
    documentCount += 1;

    for (let ordinal = 0; ordinal < doc.chunks.length; ordinal += 1) {
      const content = doc.chunks[ordinal];
      const chunk = await prisma.legalDocumentChunk.create({
        data: {
          documentId: created.id,
          ordinal,
          content,
        },
      });

      const embedding = toPgVector(embedText(`${doc.title}. ${content}`));
      await prisma.$executeRawUnsafe(
        'UPDATE legal_document_chunks SET embedding = $1::vector WHERE id = $2::uuid',
        embedding,
        chunk.id,
      );
      chunkCount += 1;
    }
  }

  console.log(
    `Seed concluído: ${documentCount} documentos, ${chunkCount} chunks.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
