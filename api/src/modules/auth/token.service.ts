import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

/**
 * Gera e faz hash de refresh tokens.
 *
 * O token opaco enviado ao cliente é aleatório; no banco guardamos apenas o
 * hash SHA-256 (determinístico), o que permite buscar o registro pelo hash e
 * nunca armazenar o valor em claro.
 */
@Injectable()
export class TokenService {
  /** Gera um refresh token opaco (base64url) criptograficamente aleatório. */
  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  /** Hash determinístico do refresh token para lookup e armazenamento. */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
