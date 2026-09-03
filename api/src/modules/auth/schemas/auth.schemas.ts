import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

/** Claims do access token JWT. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: { id: string; email: string };
  tokens: AuthTokens;
}
