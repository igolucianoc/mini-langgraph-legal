import { describe, expect, it, vi } from 'vitest';
import { LegalResearchService } from './legal-research.service';
import { DeterministicAnswerVerifier } from './domain/answer-verifier';
import { FakeRetrievalProvider } from './infrastructure/fake-retrieval.provider';
import { RuleBasedLlmProvider } from './infrastructure/rule-based-llm.provider';
import { buildFakeCorpus } from './testing/fake-corpus';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AppConfigService } from '../../config/app-config.service';
import type { RetrievalProvider } from './domain/contracts';
import type { ResearchEvent } from './presentation/research-events';

function createFakePrisma() {
  return {
    researchQuery: {
      create: vi.fn(async () => ({ id: 'query-1' })),
      update: vi.fn(async () => ({})),
    },
    researchExecution: {
      create: vi.fn(async () => ({ id: 'exec-1' })),
      update: vi.fn(async () => ({})),
    },
    researchCitation: {
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

function createService(retrieval?: RetrievalProvider) {
  const prisma = createFakePrisma();
  const config = {
    retrievalTopK: 5,
    retrievalThreshold: 0,
  } as unknown as AppConfigService;

  const service = new LegalResearchService(
    prisma as unknown as PrismaService,
    config,
    new RuleBasedLlmProvider(),
    retrieval ?? new FakeRetrievalProvider(buildFakeCorpus()),
    new DeterministicAnswerVerifier(),
  );
  return { service, prisma };
}

async function collect(
  gen: AsyncGenerator<ResearchEvent>,
): Promise<ResearchEvent[]> {
  const events: ResearchEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe('LegalResearchService', () => {
  it('emite a sequência de eventos do happy path e persiste', async () => {
    const { service, prisma } = createService();

    const events = await collect(
      service.run({
        userId: 'user-1',
        question: 'requisitos para cobrança de dívida contratual',
      }),
    );

    const types = events.map((e) => e.type);
    expect(types[0]).toBe('started');
    expect(types).toContain('classifying');
    expect(types).toContain('retrieving');
    expect(types).toContain('evidence_evaluated');
    expect(types).toContain('generating');
    expect(types).toContain('verifying');
    expect(types.at(-1)).toBe('completed');

    const completed = events.at(-1);
    expect(completed?.type).toBe('completed');
    if (completed?.type === 'completed') {
      expect(completed.outcome).toBe('ANSWERED');
      expect(completed.citations.length).toBeGreaterThan(0);
    }

    expect(prisma.researchQuery.create).toHaveBeenCalledOnce();
    expect(prisma.researchExecution.update).toHaveBeenCalled();
    expect(prisma.researchCitation.createMany).toHaveBeenCalled();
  });

  it('emite completed com INSUFFICIENT_EVIDENCE quando não há evidência', async () => {
    const emptyRetrieval: RetrievalProvider = { search: async () => [] };
    const { service } = createService(emptyRetrieval);

    const events = await collect(
      service.run({ userId: 'user-1', question: 'pergunta sem base documental' }),
    );

    const completed = events.at(-1);
    expect(completed?.type).toBe('completed');
    if (completed?.type === 'completed') {
      expect(completed.outcome).toBe('INSUFFICIENT_EVIDENCE');
      expect(completed.citations).toHaveLength(0);
    }
  });

  it('emite failed quando o retrieval lança erro (mensagem segura)', async () => {
    const brokenRetrieval: RetrievalProvider = {
      search: async () => {
        throw new Error('falha simulada no retrieval');
      },
    };
    const { service, prisma } = createService(brokenRetrieval);

    const events = await collect(
      service.run({ userId: 'user-1', question: 'pergunta que quebra o retrieval' }),
    );

    const last = events.at(-1);
    expect(last?.type).toBe('failed');
    if (last?.type === 'failed') {
      expect(last.message).toContain('falha simulada');
    }
    expect(prisma.researchExecution.update).toHaveBeenCalled();
  });
});
