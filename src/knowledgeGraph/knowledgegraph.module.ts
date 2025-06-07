import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { KnowledgeGraphService } from './services/knowledge-graph.service';
import { AssistantModule } from '../assistants/assistant.module';
@Module({
  imports: [Neo4jModule, AssistantModule],
  providers: [KnowledgeGraphService],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
