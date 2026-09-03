import { Injectable } from '@nestjs/common';
import type { AnswerVerifier, VerifyInput, VerifyResult } from './contracts';
import type { Citation, Evidence } from './legal.types';

/**
 * Verificador determinístico anti-alucinação.
 *
 * Confere que todo chunk citado pela análise existe entre as evidências
 * recuperadas. Ids citados que não existem são reportados como inválidos e a
 * resposta não é aceita. A confiança é derivada da cobertura e dos scores das
 * citações válidas — nada de fontes inventadas.
 */
@Injectable()
export class DeterministicAnswerVerifier implements AnswerVerifier {
  verify(input: VerifyInput): VerifyResult {
    const evidenceById = new Map<string, Evidence>(
      input.evidence.map((e) => [e.chunkId, e]),
    );

    const citations: Citation[] = [];
    const invalidCitedChunkIds: string[] = [];

    for (const chunkId of input.analysis.citedChunkIds) {
      const evidence = evidenceById.get(chunkId);
      if (!evidence) {
        invalidCitedChunkIds.push(chunkId);
        continue;
      }
      citations.push({
        documentId: evidence.documentId,
        chunkId: evidence.chunkId,
        title: evidence.title,
        category: evidence.category,
        snippet: evidence.snippet,
        score: evidence.score,
      });
    }

    const hasInvalid = invalidCitedChunkIds.length > 0;
    const hasCitations = citations.length > 0;
    const accepted = hasCitations && !hasInvalid;

    return {
      accepted,
      confidence: accepted ? this.computeConfidence(citations) : 0,
      citations,
      invalidCitedChunkIds,
    };
  }

  private computeConfidence(citations: readonly Citation[]): number {
    if (citations.length === 0) {
      return 0;
    }
    const avgScore =
      citations.reduce((acc, c) => acc + c.score, 0) / citations.length;
    // Pequeno bônus por múltiplas citações, saturado em 1.
    const breadthBonus = Math.min(citations.length / 5, 1) * 0.2;
    return Math.min(avgScore * 0.8 + breadthBonus, 1);
  }
}
