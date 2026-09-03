import { Logger } from '@nestjs/common';
import {
  LEGAL_CATEGORIES,
  LEGAL_INTENTS,
} from '../../domain/legal.types';
import type {
  AnalyzeInput,
  ClassifyInput,
  LlmProvider,
} from '../../domain/contracts';
import type {
  AnalysisResult,
  Classification,
} from '../../domain/legal.types';
import {
  analysisSchema,
  classificationSchema,
} from '../../schemas/legal.schemas';

export interface HuggingFaceLlmConfig {
  apiToken: string;
  model: string;
  timeoutMs: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Adapter de LLM sobre a Inference API da Hugging Face (endpoint compatível com
 * chat completions). O domínio nunca importa este arquivo diretamente — só o
 * contrato `LlmProvider`. Saídas do modelo são validadas com Zod.
 */
export class HuggingFaceLlmProvider implements LlmProvider {
  private readonly logger = new Logger(HuggingFaceLlmProvider.name);
  readonly modelName: string;

  constructor(private readonly config: HuggingFaceLlmConfig) {
    this.modelName = config.model;
  }

  async classify(input: ClassifyInput): Promise<Classification> {
    const content = await this.chat([
      {
        role: 'system',
        content:
          'Você classifica perguntas jurídicas educacionais. Responda APENAS com JSON válido, sem texto adicional.',
      },
      {
        role: 'user',
        content: this.classifyPrompt(input.question),
      },
    ]);

    const parsed = classificationSchema.parse(this.extractJson(content));
    return parsed as Classification;
  }

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const evidenceBlock = input.evidence
      .map(
        (e) =>
          `[chunkId=${e.chunkId}] (${e.category}) ${e.title}: ${e.snippet}`,
      )
      .join('\n');

    const content = await this.chat([
      {
        role: 'system',
        content:
          'Você é um assistente de triagem jurídica EDUCACIONAL. Baseie-se somente nas evidências fornecidas. NUNCA invente fontes. Cite apenas os chunkId listados. Responda APENAS com JSON válido.',
      },
      {
        role: 'user',
        content: this.analyzePrompt(input.question, evidenceBlock),
      },
    ]);

    const parsed = analysisSchema.parse(this.extractJson(content));
    return parsed as AnalysisResult;
  }

  private classifyPrompt(question: string): string {
    return [
      `Pergunta: "${question}"`,
      '',
      'Retorne JSON com o formato:',
      '{',
      `  "intent": um de ${JSON.stringify(LEGAL_INTENTS)},`,
      `  "category": um de ${JSON.stringify(LEGAL_CATEGORIES)} ou null,`,
      '  "needsResearch": boolean,',
      '  "confidence": número entre 0 e 1',
      '}',
    ].join('\n');
  }

  private analyzePrompt(question: string, evidenceBlock: string): string {
    return [
      `Pergunta: "${question}"`,
      '',
      'Evidências disponíveis (use apenas estas, cite pelos chunkId):',
      evidenceBlock,
      '',
      'Retorne JSON com o formato:',
      '{',
      '  "summary": orientação educacional resumida,',
      '  "reasoning": justificativa ancorada nas evidências,',
      '  "citedChunkIds": lista dos chunkId efetivamente usados',
      '}',
    ].join('\n');
  }

  private async chat(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        'https://router.huggingface.co/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature: 0.1,
            max_tokens: 800,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        // Nunca logar o token; apenas status e modelo.
        this.logger.error(
          `Falha na Hugging Face (status ${response.status}, modelo ${this.modelName}).`,
        );
        throw new Error(`Hugging Face respondeu status ${response.status}.`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta da Hugging Face sem conteúdo.');
      }
      return content;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Tempo limite excedido ao chamar a Hugging Face.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Extrai o primeiro objeto JSON do texto retornado pelo modelo. */
  private extractJson(content: string): unknown {
    const trimmed = content.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('Não foi possível localizar JSON na resposta do modelo.');
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }
}
