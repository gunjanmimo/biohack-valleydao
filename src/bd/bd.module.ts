import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BdService } from './service/bd.service';
import { Business } from './schema/business.schema';
import { TargetMarket } from './schema/target-market.schema';
import { BusinessPersona } from './schema/business-persona.schema';
import { MarketSegment } from './schema/market-segment.schema';
import { AssistantModule } from 'src/assistant/assistant.module';
import { ProjectModule } from 'src/project/project.module';
@Module({
  providers: [BdService],
  exports: [BdService],
  imports: [
    TypeOrmModule.forFeature([
      Business,
      TargetMarket,
      BusinessPersona,
      MarketSegment,
    ]),
    AssistantModule,
    ProjectModule,
  ],
})
export class BdModule {}
