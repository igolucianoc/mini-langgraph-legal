import { z } from 'zod';
import { LEGAL_CATEGORIES, LEGAL_INTENTS } from '../domain/legal.types';

/** Pergunta submetida pelo usuário. */
export const askQuestionSchema = z.object({
  question: z.string().trim().min(8).max(1000),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

const categoryEnum = z.enum(
  LEGAL_CATEGORIES as [string, ...string[]],
) as z.ZodType<(typeof LEGAL_CATEGORIES)[number]>;

const intentEnum = z.enum(
  LEGAL_INTENTS as [string, ...string[]],
) as z.ZodType<(typeof LEGAL_INTENTS)[number]>;

/**
 * Validação da saída de classificação do LLM. Toda saída crítica do modelo é
 * validada antes de virar estado do grafo.
 */
export const classificationSchema = z.object({
  intent: intentEnum,
  category: categoryEnum.nullable(),
  needsResearch: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export type ClassificationOutput = z.infer<typeof classificationSchema>;

/** Validação da saída de análise do LLM. */
export const analysisSchema = z.object({
  summary: z.string().min(1).max(4000),
  reasoning: z.string().min(1).max(6000),
  citedChunkIds: z.array(z.string().min(1)).max(20),
});

export type AnalysisOutput = z.infer<typeof analysisSchema>;
