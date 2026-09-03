/**
 * Seed da base documental jurídica fictícia.
 *
 * Os embeddings dos documentos DEVEM usar o mesmo provider das perguntas, senão
 * a busca vetorial não encontra nada (espaços vetoriais diferentes). A IA é
 * sempre a Hugging Face: o seed exige `HF_API_TOKEN` (não há fallback local).
 */
import { PrismaClient } from '@prisma/client';
import { toPgVector } from '../src/shared/deterministic-embedding';
import { HuggingFaceEmbeddingsProvider } from '../src/modules/legal-research/infrastructure/huggingface/huggingface-embeddings.provider';
import type { EmbeddingsProvider } from '../src/modules/legal-research/domain/contracts';
import { seedDocuments } from './seed-data';

const prisma = new PrismaClient();

function buildEmbeddingsProvider(): { provider: EmbeddingsProvider; label: string } {
  const apiToken = process.env.HF_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      'HF_API_TOKEN é obrigatório para gerar os embeddings do seed (IA via Hugging Face).',
    );
  }

  const model =
    process.env.HF_EMBEDDINGS_MODEL ??
    'sentence-transformers/all-MiniLM-L6-v2';

  return {
    label: `huggingface (${model})`,
    provider: new HuggingFaceEmbeddingsProvider({
      apiToken,
      model,
      timeoutMs: Number(process.env.HF_TIMEOUT_MS ?? '30000'),
    }),
  };
}

async function resetLegalBase(): Promise<void> {
  // Ordem respeita as FKs (citations -> executions -> queries; chunks -> documents).
  await prisma.researchCitation.deleteMany();
  await prisma.researchExecution.deleteMany();
  await prisma.researchQuery.deleteMany();
  await prisma.legalDocumentChunk.deleteMany();
  await prisma.legalDocument.deleteMany();
}

async function main(): Promise<void> {
  const { provider, label } = buildEmbeddingsProvider();
  console.log(`Gerando embeddings com provider: ${label}`);

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

    // Vetoriza todos os trechos do documento (um batch por documento).
    const texts = doc.chunks.map((content) => `${doc.title}. ${content}`);
    const embeddings = await provider.embed(texts);

    for (let ordinal = 0; ordinal < doc.chunks.length; ordinal += 1) {
      const content = doc.chunks[ordinal];
      const chunk = await prisma.legalDocumentChunk.create({
        data: {
          documentId: created.id,
          ordinal,
          content,
        },
      });

      const vector = toPgVector(embeddings[ordinal]);
      await prisma.$executeRawUnsafe(
        'UPDATE legal_document_chunks SET embedding = $1::vector WHERE id = $2::uuid',
        vector,
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
