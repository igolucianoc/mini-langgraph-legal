import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LegalProvidersModule } from './legal-providers.module';
import { LegalResearchService } from './legal-research.service';
import { LegalResearchController } from './presentation/legal-research.controller';

@Module({
  imports: [LegalProvidersModule, JwtModule.register({})],
  controllers: [LegalResearchController],
  providers: [LegalResearchService],
  exports: [LegalResearchService],
})
export class LegalResearchModule {}
