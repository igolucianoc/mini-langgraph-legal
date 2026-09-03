import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AppConfigService } from '../../config/app-config.service';
import type { JwtService } from '@nestjs/jwt';

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
}

interface RefreshRow {
  userId: string;
  tokenHash: string;
  replacedByHash: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
}

/** Prisma em memória, suficiente para exercitar as regras de auth. */
function createFakePrisma() {
  const users: UserRow[] = [];
  const refreshTokens: RefreshRow[] = [];

  const prisma = {
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { email?: string; id?: string } }) =>
          users.find(
            (u) =>
              (where.email !== undefined && u.email === where.email) ||
              (where.id !== undefined && u.id === where.id),
          ) ?? null,
      ),
      create: vi.fn(
        async ({ data }: { data: { email: string; passwordHash: string } }) => {
          const row: UserRow = {
            id: `user-${users.length + 1}`,
            email: data.email,
            passwordHash: data.passwordHash,
          };
          users.push(row);
          return row;
        },
      ),
    },
    refreshToken: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const row: RefreshRow = {
            userId: data.userId,
            tokenHash: data.tokenHash,
            replacedByHash: null,
            revokedAt: null,
            expiresAt: data.expiresAt,
          };
          refreshTokens.push(row);
          return row;
        },
      ),
      findUnique: vi.fn(
        async ({ where }: { where: { tokenHash: string } }) =>
          refreshTokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { tokenHash: string };
          data: Partial<RefreshRow>;
        }) => {
          const row = refreshTokens.find((t) => t.tokenHash === where.tokenHash);
          if (row) {
            Object.assign(row, data);
          }
          return row;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId?: string; tokenHash?: string; revokedAt?: null };
          data: Partial<RefreshRow>;
        }) => {
          let count = 0;
          for (const row of refreshTokens) {
            const matchUser =
              where.userId === undefined || row.userId === where.userId;
            const matchHash =
              where.tokenHash === undefined || row.tokenHash === where.tokenHash;
            const matchRevoked =
              where.revokedAt === undefined || row.revokedAt === null;
            if (matchUser && matchHash && matchRevoked) {
              Object.assign(row, data);
              count += 1;
            }
          }
          return { count };
        },
      ),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return { prisma, users, refreshTokens };
}

function createDeps() {
  const { prisma, refreshTokens } = createFakePrisma();
  const jwt = {
    signAsync: vi.fn(async () => 'access-token'),
  };
  const config = {
    jwtAccessSecret: 'access-secret',
    jwtAccessTtl: 900,
    jwtRefreshTtl: 604800,
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    new TokenService(),
    config as unknown as AppConfigService,
  );
  return { service, prisma, jwt, refreshTokens };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra novo usuário e emite tokens', async () => {
    const { service } = createDeps();

    const result = await service.register({
      email: 'a@example.com',
      password: 'senha-forte-123',
    });

    expect(result.user.email).toBe('a@example.com');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('recusa registro com e-mail já existente', async () => {
    const { service } = createDeps();
    await service.register({
      email: 'dup@example.com',
      password: 'senha-forte-123',
    });

    await expect(
      service.register({ email: 'dup@example.com', password: 'senha-forte-123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('faz login com credenciais válidas', async () => {
    const { service } = createDeps();
    await service.register({
      email: 'login@example.com',
      password: 'senha-forte-123',
    });

    const result = await service.login({
      email: 'login@example.com',
      password: 'senha-forte-123',
    });

    expect(result.user.email).toBe('login@example.com');
  });

  it('recusa login com senha inválida', async () => {
    const { service } = createDeps();
    await service.register({
      email: 'x@example.com',
      password: 'senha-forte-123',
    });

    await expect(
      service.login({ email: 'x@example.com', password: 'senha-errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('recusa login de usuário inexistente', async () => {
    const { service } = createDeps();

    await expect(
      service.login({ email: 'nao@existe.com', password: 'qualquer-coisa' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotaciona o refresh token e invalida o anterior', async () => {
    const { service } = createDeps();
    const registered = await service.register({
      email: 'rot@example.com',
      password: 'senha-forte-123',
    });
    const first = registered.tokens.refreshToken;

    const rotated = await service.refresh(first);

    expect(rotated.refreshToken).not.toBe(first);
    // Reusar o token antigo agora dispara reuse detection.
    await expect(service.refresh(first)).rejects.toThrow(/reutilizado/i);
  });

  it('detecta reuse e revoga toda a cadeia', async () => {
    const { service, refreshTokens } = createDeps();
    const registered = await service.register({
      email: 'reuse@example.com',
      password: 'senha-forte-123',
    });
    const first = registered.tokens.refreshToken;
    const rotated = await service.refresh(first);

    await expect(service.refresh(first)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    // Após reuse, o token rotacionado também deve estar revogado.
    const activeTokens = refreshTokens.filter((t) => t.revokedAt === null);
    expect(activeTokens).toHaveLength(0);
    expect(rotated.refreshToken).toBeTruthy();
  });

  it('recusa refresh de token expirado', async () => {
    const { service, refreshTokens } = createDeps();
    const registered = await service.register({
      email: 'exp@example.com',
      password: 'senha-forte-123',
    });
    const token = registered.tokens.refreshToken;
    const stored = refreshTokens.find((t) => t.revokedAt === null);
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 1000);
    }

    await expect(service.refresh(token)).rejects.toThrow(/expirado/i);
  });

  it('logout revoga o refresh token', async () => {
    const { service, refreshTokens } = createDeps();
    const registered = await service.register({
      email: 'out@example.com',
      password: 'senha-forte-123',
    });

    await service.logout(registered.tokens.refreshToken);

    expect(refreshTokens.every((t) => t.revokedAt !== null)).toBe(true);
    await expect(service.refresh(registered.tokens.refreshToken)).rejects.toThrow(
      /reutilizado/i,
    );
  });

  it('recusa refresh de token inexistente', async () => {
    const { service } = createDeps();

    await expect(service.refresh('inexistente')).rejects.toThrow(/inválido/i);
  });
});

// Garante que argon2 está realmente sendo usado (hash != senha em claro).
describe('argon2 integração', () => {
  it('gera hash verificável', async () => {
    const hash = await argon2.hash('senha-forte-123');
    expect(hash).not.toContain('senha-forte-123');
    expect(await argon2.verify(hash, 'senha-forte-123')).toBe(true);
  });
});
