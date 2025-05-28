import { Module } from '@nestjs/common';
import { TdService } from './service/td.service';
import { CopilotService } from './service/copilot.service';
import { CopilotAnalysisService } from './service/copilot-analysis.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantModule } from 'src/assistant/assistant.module';
import { Copilot } from './schema/copilot.schema';
import { Project } from '../project/schema/project.schema';
@Module({
  providers: [TdService, CopilotService, CopilotAnalysisService],
  exports: [TdService, CopilotService, CopilotAnalysisService],
  imports: [TypeOrmModule.forFeature([Copilot, Project]), AssistantModule],
})
export class TdModule {}
