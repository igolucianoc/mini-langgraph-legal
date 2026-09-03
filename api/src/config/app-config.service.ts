import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Acesso tipado às variáveis de ambiente já validadas.
 * Isola o resto da aplicação do ConfigService bruto.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get apiPort(): number {
    return this.get('API_PORT');
  }

  get corsOrigin(): string {
    return this.get('CORS_ORIGIN');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.get('JWT_REFRESH_SECRET');
  }

  get jwtAccessTtl(): number {
    return this.get('JWT_ACCESS_TTL');
  }

  get jwtRefreshTtl(): number {
    return this.get('JWT_REFRESH_TTL');
  }

  get hfApiToken(): string {
    return this.get('HF_API_TOKEN');
  }

  get hfModel(): string {
    return this.get('HF_MODEL');
  }

  get hfEmbeddingsModel(): string {
    return this.get('HF_EMBEDDINGS_MODEL');
  }

  get hfTimeoutMs(): number {
    return this.get('HF_TIMEOUT_MS');
  }

  get retrievalTopK(): number {
    return this.get('RETRIEVAL_TOP_K');
  }

  get retrievalThreshold(): number {
    return this.get('RETRIEVAL_THRESHOLD');
  }
}
