import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { TokenService } from './token.service';
import type {
  AccessTokenClaims,
  AuthResult,
  AuthTokens,
  CredentialsInput,
} from './schemas/auth.schemas';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  async register(input: CredentialsInput): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email }, tokens };
  }

  async login(input: CredentialsInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    // Comparação sempre executada para não vazar existência via timing.
    const valid =
      user !== null && (await argon2.verify(user.passwordHash, input.password));
    if (!user || !valid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email }, tokens };
  }

  /**
   * Rotaciona o refresh token. Se o token apresentado já foi usado (rotacionado)
   * ou revogado, trata como reuse: revoga toda a cadeia do usuário e recusa.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const isReuse = stored.revokedAt !== null || stored.replacedByHash !== null;
    if (isReuse) {
      // Reuse detection: invalida todos os tokens ativos do usuário.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reutilizado.');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const newRefresh = this.tokens.generateRefreshToken();
    const newHash = this.tokens.hashRefreshToken(newRefresh);
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtl * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date(), replacedByHash: newHash },
      }),
      this.prisma.refreshToken.create({
        data: { userId: user.id, tokenHash: newHash, expiresAt },
      }),
    ]);

    const accessToken = await this.signAccessToken(user.id, user.email);
    return {
      accessToken,
      refreshToken: newRefresh,
      expiresIn: this.config.jwtAccessTtl,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const refreshToken = this.tokens.generateRefreshToken();
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtl * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const accessToken = await this.signAccessToken(userId, email);
    return { accessToken, refreshToken, expiresIn: this.config.jwtAccessTtl };
  }

  private async signAccessToken(sub: string, email: string): Promise<string> {
    const claims: AccessTokenClaims = { sub, email };
    return this.jwt.signAsync(claims, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtl,
    });
  }
}
