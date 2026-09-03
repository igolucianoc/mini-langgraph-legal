import {
  Controller,
  Get,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { AppConfigService } from '../../../config/app-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { LegalResearchService } from '../legal-research.service';
import { CurrentUser } from '../../auth/current-user.decorator';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../../auth/jwt-auth.guard';
import { askQuestionSchema } from '../schemas/legal.schemas';
import type { AccessTokenClaims } from '../../auth/schemas/auth.schemas';

@Controller('research')
export class LegalResearchController {
  constructor(
    private readonly service: LegalResearchService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Executa uma pesquisa e transmite os eventos do grafo via SSE.
   *
   * EventSource não permite cabeçalhos, então o access token vem por query
   * param e é verificado aqui. A pergunta também vem por query param.
   */
  @Sse('stream')
  stream(
    @Query('token') token: string,
    @Query('question') question: string,
  ): Observable<MessageEvent> {
    const user = this.verifyToken(token);
    const parsed = askQuestionSchema.parse({ question });

    return new Observable<MessageEvent>((subscriber) => {
      let cancelled = false;

      const pump = async (): Promise<void> => {
        try {
          for await (const event of this.service.run({
            userId: user.id,
            question: parsed.question,
          })) {
            if (cancelled) {
              return;
            }
            subscriber.next({ type: event.type, data: event });
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      };

      void pump();

      // Cleanup quando o cliente desconecta.
      return () => {
        cancelled = true;
      };
    });
  }

  /** Histórico simples das últimas execuções do usuário autenticado. */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async history(@CurrentUser() user: AuthenticatedUser) {
    const queries = await this.prisma.researchQuery.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            correlationId: true,
            status: true,
            outcome: true,
            confidence: true,
            createdAt: true,
          },
        },
      },
    });

    return queries.map((q) => ({
      id: q.id,
      question: q.question,
      category: q.category,
      createdAt: q.createdAt,
      lastExecution: q.executions[0] ?? null,
    }));
  }

  private verifyToken(token: string): AuthenticatedUser {
    if (!token) {
      throw new UnauthorizedException('Token ausente.');
    }
    try {
      const claims = this.jwt.verify<AccessTokenClaims>(token, {
        secret: this.config.jwtAccessSecret,
      });
      return { id: claims.sub, email: claims.email };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
