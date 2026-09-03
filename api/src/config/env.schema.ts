import { z } from 'zod';

/** Schema de validação das variáveis de ambiente da API. */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),

  AI_PROVIDER: z.enum(['fake', 'huggingface']).default('fake'),
  HF_API_TOKEN: z.string().optional().default(''),
  HF_MODEL: z.string().default('meta-llama/Llama-3.1-8B-Instruct'),
  HF_EMBEDDINGS_MODEL: z
    .string()
    .default('sentence-transformers/all-MiniLM-L6-v2'),
  HF_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(5),
  RETRIEVAL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
});

export type Env = z.infer<typeof envSchema>;

/** Valida e normaliza `process.env`, lançando erro claro se inválido. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${issues}`);
  }
  return parsed.data;
}
