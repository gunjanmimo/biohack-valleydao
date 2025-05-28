import { Injectable } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { CopilotAnalysisService } from './copilot-analysis.service';
@Injectable()
export class TdService {
  constructor(
    private copilotService: CopilotService,
    private copilotAnalysisService: CopilotAnalysisService,
  ) {}

  async tdPipeline(projectId: string): Promise<void> {
    await this.copilotService.showCopilot(projectId);
    await this.copilotAnalysisService.generateTasks(projectId);
    await this.copilotAnalysisService.generateResearchQueries(projectId);
    await this.copilotAnalysisService.runResearchJob(projectId);
    await this.copilotAnalysisService.generateFinalReports(projectId);
  }
}
