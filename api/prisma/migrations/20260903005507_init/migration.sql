-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "LegalCategory" AS ENUM ('CONTRACTS', 'DEFAULT_BREACH', 'CIVIL_LIABILITY', 'CIVIL_PROCEDURE', 'CONSUMER');

-- CreateEnum
CREATE TYPE "ResearchOutcome" AS ENUM ('ANSWERED', 'INSUFFICIENT_EVIDENCE', 'DIRECT_ANSWER', 'FAILED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('STARTED', 'CLASSIFYING', 'RETRIEVING', 'EVIDENCE_EVALUATED', 'GENERATING', 'VERIFYING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "replacedByHash" TEXT,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LegalCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_chunks" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384),

    CONSTRAINT "legal_document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_queries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "intent" TEXT,
    "category" "LegalCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_executions" (
    "id" UUID NOT NULL,
    "queryId" UUID NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'STARTED',
    "outcome" "ResearchOutcome",
    "confidence" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "analysis" TEXT,
    "latencyMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_citations" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "chunkId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "snippet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");

-- CreateIndex
CREATE INDEX "legal_documents_category_idx" ON "legal_documents"("category");

-- CreateIndex
CREATE INDEX "legal_document_chunks_documentId_idx" ON "legal_document_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_chunks_documentId_ordinal_key" ON "legal_document_chunks"("documentId", "ordinal");

-- CreateIndex
CREATE INDEX "research_queries_userId_idx" ON "research_queries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "research_executions_correlationId_key" ON "research_executions"("correlationId");

-- CreateIndex
CREATE INDEX "research_executions_queryId_idx" ON "research_executions"("queryId");

-- CreateIndex
CREATE INDEX "research_citations_executionId_idx" ON "research_citations"("executionId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_chunks" ADD CONSTRAINT "legal_document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_queries" ADD CONSTRAINT "research_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_executions" ADD CONSTRAINT "research_executions_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "research_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_citations" ADD CONSTRAINT "research_citations_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "research_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_citations" ADD CONSTRAINT "research_citations_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "legal_document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (busca vetorial por similaridade coseno via pgvector)
CREATE INDEX "legal_document_chunks_embedding_idx"
  ON "legal_document_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
