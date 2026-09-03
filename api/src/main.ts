import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfigService);

  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });
  // Validação de entrada é feita por rota com Zod (ZodValidationPipe).
  const port = config.apiPort;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Mini Legal Graph API on port ${port}`);
}

void bootstrap();
