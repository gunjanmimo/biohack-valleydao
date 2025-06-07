import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './service/project.service';
import { Project } from './schema/project.schema';
import { AriService } from './service/ari.service';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';
import { AssistantModule } from 'src/assistant/assistant.module';
import { BdService } from 'src/bd/service/bd.service';
import { TdService } from 'src/td/service/td.service';
import { CopilotService } from 'src/td/service/copilot.service';
import { Business } from 'src/bd/schema/business.schema';
import { BusinessPersona } from 'src/bd/schema/business-persona.schema';
import { TargetMarket } from 'src/bd/schema/target-market.schema';
import { MarketSegment } from 'src/bd/schema/market-segment.schema';
import { CopilotAnalysisService } from 'src/td/service/copilot-analysis.service';
import { Copilot } from 'src/td/schema/copilot.schema';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Business, // Add this
      BusinessPersona, // Add this
      MarketSegment, // Add this
      TargetMarket, // Add this
      Copilot, // Add this
    ]),
    AssistantModule,
  ],
  providers: [
    ProjectService,
    AriService,
    OpenaiAssistantService,
    BdService,
    TdService,
    CopilotService,
    CopilotAnalysisService,
  ],
  exports: [ProjectService, AriService],
})
export class ProjectModule {}
