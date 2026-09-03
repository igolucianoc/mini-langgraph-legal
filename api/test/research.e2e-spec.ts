import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Teste E2E do fluxo principal: login → pergunta → execução do grafo → resposta.
 *
 * Usa o provider FAKE (AI_PROVIDER não é 'huggingface'), portanto NÃO depende da
 * Hugging Face. Requer um Postgres acessível via DATABASE_URL com o schema
 * migrado e o seed aplicado (o script de e2e cuida disso).
 */
describe('Research E2E (fake provider, sem Hugging Face)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.AI_PROVIDER = 'fake';
    process.env.JWT_ACCESS_SECRET ??= 'e2e-access';
    process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    const url = await app.getUrl();
    // Normaliza host para IPv4 local.
    baseUrl = url.replace('[::1]', '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra, pergunta e recebe uma resposta com fontes via SSE', async () => {
    const email = `e2e-${Date.now()}@example.com`;

    const registerRes = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password: 'senha-forte-123' })
      .expect(201);

    const accessToken = registerRes.body.tokens.accessToken as string;
    expect(accessToken).toBeTruthy();

    const question = encodeURIComponent(
      'requisitos para cobrança de dívida contratual',
    );

    // Consome o SSE como texto (supertest lê o corpo até o fim do stream).
    const streamRes = await request(baseUrl)
      .get(`/research/stream?token=${accessToken}&question=${question}`)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => callback(null, data));
      });

    const body = (streamRes.body as string) || (streamRes.text as string);
    expect(body).toContain('event: started');
    expect(body).toContain('event: classifying');
    expect(body).toContain('event: retrieving');
    expect(body).toContain('event: completed');
    expect(body).toContain('"outcome":"ANSWERED"');
    expect(body).toContain('"citations"');

    // Histórico deve refletir a execução.
    const historyRes = await request(baseUrl)
      .get('/research/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body.length).toBeGreaterThan(0);
    expect(historyRes.body[0].question).toContain('cobrança');
  });

  it('recusa acesso ao stream sem token válido', async () => {
    await request(baseUrl)
      .get('/research/stream?token=invalido&question=pergunta%20de%20teste')
      .expect(401);
  });
});
