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
  choices?: Array<{
    message?: { content?: string; reasoning_content?: string };
    finish_reason?: string;
  }>;
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
            // Alto o suficiente para modelos de reasoning, que gastam tokens
            // "pensando" antes de emitir o conteúdo final.
            max_tokens: 3000,
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
      const message = data.choices?.[0]?.message;
      // Alguns modelos de reasoning colocam a saída em `reasoning_content`
      // quando `content` vem vazio; aceitamos ambos e o JSON é extraído depois.
      const content = message?.content || message?.reasoning_content;
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

  /**
   * Extrai um objeto JSON do texto retornado pelo modelo.
   *
   * Modelos com "thinking" (como o MiniMax-M3) podem emitir raciocínio antes do
   * JSON, envolver a saída em fences markdown (```json ... ```), ou incluir
   * chaves `{}` no texto de raciocínio. A estratégia:
   *  1. remove blocos de reasoning delimitados (`<think>…</think>` etc.);
   *  2. tenta cada bloco de fenced code (```…```) como candidato;
   *  3. faz varredura balanceada de chaves para achar o primeiro objeto válido.
   */
  private extractJson(content: string): unknown {
    const withoutThinking = this.stripReasoningBlocks(content).trim();

    for (const candidate of this.jsonCandidates(withoutThinking)) {
      const parsed = this.tryParse(candidate);
      if (parsed !== undefined) {
        return parsed;
      }
    }

    throw new Error('Não foi possível localizar JSON na resposta do modelo.');
  }

  /** Remove blocos de raciocínio comuns em modelos com modo "thinking". */
  private stripReasoningBlocks(content: string): string {
    return content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
  }

  /**
   * Gera candidatos a JSON, em ordem de preferência: conteúdo de fences de
   * código primeiro; depois cada objeto `{…}` balanceado encontrado no texto.
   */
  private *jsonCandidates(text: string): Generator<string> {
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let fence: RegExpExecArray | null;
    while ((fence = fenceRegex.exec(text)) !== null) {
      yield fence[1].trim();
    }

    yield* this.balancedObjects(text);
  }

  /**
   * Percorre o texto e devolve cada objeto JSON com chaves balanceadas,
   * ignorando chaves dentro de strings. Assim, `{` que aparecem no raciocínio
   * não corrompem a extração do objeto real.
   */
  private *balancedObjects(text: string): Generator<string> {
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        if (depth === 0) {
          start = i;
        }
        depth += 1;
      } else if (char === '}') {
        if (depth > 0) {
          depth -= 1;
          if (depth === 0 && start !== -1) {
            yield text.slice(start, i + 1);
            start = -1;
          }
        }
      }
    }
  }

  private tryParse(candidate: string): unknown {
    if (!candidate) {
      return undefined;
    }
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      return undefined;
    }
  }
}
