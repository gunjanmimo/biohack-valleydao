import { Module } from '@nestjs/common';
import { CommonAssistantService } from './service/common.assistant.service';
import { OpenaiAssistantService } from './service/openai.assistant.service';
import { PerplexityAssistantService } from './service/perplexity.assistant.service';
@Module({
  exports: [
    CommonAssistantService,
    OpenaiAssistantService,
    PerplexityAssistantService,
  ],
  providers: [
    CommonAssistantService,
    OpenaiAssistantService,
    PerplexityAssistantService,
  ],
})
export class AssistantModule {}
