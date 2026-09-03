import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { AppConfigService } from './app-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Em dev local carrega api/.env; no container o arquivo não existe
      // (excluído via .dockerignore) e as variáveis vêm do docker-compose.
      // Variáveis já presentes em process.env têm precedência sobre o arquivo.
      envFilePath: '.env',
      validate: (raw) => validateEnv(raw),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
