import { describe, expect, it } from 'vitest';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const service = new TokenService();

  it('gera refresh tokens distintos a cada chamada', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(32);
  });

  it('hash é determinístico e não contém o token em claro', () => {
    const token = service.generateRefreshToken();

    const h1 = service.hashRefreshToken(token);
    const h2 = service.hashRefreshToken(token);

    expect(h1).toBe(h2);
    expect(h1).not.toContain(token);
    expect(h1).toHaveLength(64);
  });
});
