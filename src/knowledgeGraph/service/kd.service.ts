import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';
import { Neo4jService } from './neo4j.service';
import { Event } from '../types/EventType';
import {
  KnowledgeGraphNodeType,
  ContradictionStatus,
} from '../types/KnowledgeGraphNodeType';
@Injectable()
export class KnowledgeGraphService {
  private gateway: any;
  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly neo4jService: Neo4jService,
  ) {}

  setGateway(gateway: any) {
    this.gateway = gateway;
    console.log('🔗 Gateway connected to service');
  }

  async getPreviousEvents(projectId: string): Promise<Event[]> {
    console.log(`📋 Initializing knowledge graph for project: ${projectId}`);

    const query = `
    MATCH (p:Project {id: $projectId})-[:Event]->(eventGroup:Event)
    MATCH (eventGroup)-[r]->(e:Event)
    WHERE e.nodeType = $eventLogNodeType
    RETURN e.id AS id, 
           e.title AS title, 
           e.description AS description, 
           e.createdAt AS createdAt,
           e.updatedAt AS updatedAt,
           e.newVariables AS newVariables,
           e.insights AS insights,
           e.contradictions AS contradictions
    ORDER BY e.createdAt DESC
  `;

    try {
      const result = await this.neo4jService.executeQuery(query, {
        projectId,
        eventLogNodeType: KnowledgeGraphNodeType.EVENT_LOG,
      });

      if (result && result.length > 0) {
        return result.map((record: any) => ({
          id: record.id,
          title: record.title,
          description: record.description,
          createdAt: record.createdAt
            ? new Date(record.createdAt).toISOString()
            : null,
          updatedAt: record.updatedAt
            ? new Date(record.updatedAt).toISOString()
            : null,
          newVariables: record.newVariables
            ? JSON.parse(record.newVariables)
            : [],
          insights: record.insights ? JSON.parse(record.insights) : [],
          contradictions: record.contradictions
            ? JSON.parse(record.contradictions)
            : [],
        }));
      }

      console.log(`📭 No previous events found for project: ${projectId}`);
      return [];
    } catch (error) {
      console.error(
        `❌ Error fetching previous events for project ${projectId}:`,
        error,
      );
      throw new Error(`Failed to fetch previous events: ${error.message}`);
    }
  }

  async addProjectToKnowledgeGraph(
    projectId: string,
    projectName: string,
  ): Promise<void> {
    const query = `
    CREATE (A:Project {id: $projectId, name: $projectName, nodeType: 'Project'})
    MERGE (A)-[:Event]->(E:Event {projectId: $projectId, nodeType: '${KnowledgeGraphNodeType.EVENT}'})
    MERGE (A)-[:TechnologyDevelopment]->(TD:TechnologyDevelopment {projectId: $projectId, nodeType: '${KnowledgeGraphNodeType.TECHNOLOGY_DEVELOPMENT}'})
    MERGE (A)-[:BusinessDevelopment]->(BD:BusinessDevelopment {projectId: $projectId, nodeType: '${KnowledgeGraphNodeType.BUSINESS_DEVELOPMENT}'})
    `;
    await this.neo4jService.executeQuery(query, {
      projectId,
      projectName,
    });
  }

  async addEventToKnowledgeGraph(
    projectId: string,
    event: {
      id: string;
      title: string;
      description: string;
      stringifiedEventData?: string;
    },
    edgeLabel: string,
  ): Promise<void> {
    console.log(`🆕 Adding new event log for project: ${projectId}`);
    console.log(
      `📝 Event data: \nTitle: ${event.title} \nDescription: ${event.description}`,
    );
    console.log('-'.repeat(50));

    if (!event.stringifiedEventData) {
      // STEP 1: CREATE INDIVIDUAL EVENT NODE
      const eventNodeCreationQuery = `
      CREATE (e:Event {id: $id, title: $title, description: $description, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}', createdAt: datetime()})
      MERGE (p:Project {id: $projectId})-[:Event]->(eventGroup:Event)
      MERGE (eventGroup)-[:${edgeLabel}]->(e)
    `;
      await this.neo4jService.executeQuery(eventNodeCreationQuery, {
        id: event.id,
        title: event.title,
        description: event.description,
        projectId,
      });
      console.warn(
        '⚠️ No event data provided. Skipping embedding and storage steps.',
      );
      this.gateway.emitToProject(projectId, 'new-activity-added', {
        id: event.id,
        title: event.title,
        description: event.description,
        createdAt: new Date().toISOString(),
      });
      return;
    }
    // STEP 2: CREATE EMBEDDING FOR EVENT DATA
    console.log(`🔍 Creating embedding for event data`);
    let textContent = `
    Event Title: ${event.title}
    Event Description: ${event.description}
    Event Data: ${event.stringifiedEventData}
    `;

    const embedding =
      await this.openaiAssistantService.createTextEmbedding(textContent);
    // STEP 3: STORE EMBEDDING TO EMBEDDING NODE
    console.log(`📊 Embedding created for event node`);
    const embeddingNodeCreationQuery = `
      MATCH (eventLog:Event {id: $eventId, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}'})
      CREATE (e:Embedding {id: $id, title: 'Embedding', embedding: $embedding, nodeType: '${KnowledgeGraphNodeType.EMBEDDING}'})
      MERGE (eventLog)-[:EMBEDDING]->(e)
    `;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Embedding is empty or not an array');
    }
    await this.neo4jService.executeQuery(embeddingNodeCreationQuery, {
      id: event.id + '-embedding',
      embedding: embedding,
      eventId: event.id,
    });
    // STEP 4: STORE RAW DATA TO EVENT LOG NODE
    console.log(`📄 Storing raw data for event: ${event.id}`);
    const rawDataNodeCreationQuery = `
      MATCH (eventLog:Event {id: $eventId, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}'})
      CREATE (e:RawData {id: $id, title: 'RawData', data: $data, nodeType: '${KnowledgeGraphNodeType.RAW_DATA}'})
      MERGE (eventLog)-[:RAW_DATA]->(e)
    `;
    await this.neo4jService.executeQuery(rawDataNodeCreationQuery, {
      id: event.id + '-raw-data',
      data: event.stringifiedEventData,
      eventId: event.id,
    });

    // STEP 5: FIND RELEVANT VARIABLE NODES
    const relevantVariableNodes = await this.findRelevantVariableNodes(
      projectId,
      event.id,
    );
    console.log(`🔍 Finding relevant variable nodes for event: ${event.id}`);
    const relevantVariableNodesData = `
    Found ${relevantVariableNodes.length} relevant variable nodes for this event.


    Each variable node contains the following information:
    ${relevantVariableNodes
      .map(
        (node) =>
          `- Variable ID: ${node.variableId}, Name: ${node.variableName}, Values: ${node.variableValues.join(
            ', ',
          )}, Description: ${node.description}, Insights: ${node.insights.join(
            ', ',
          )}`,
      )
      .join('\n')}
    `;
    // STEP 6: ASK AGENT

    const collaboratorAgentResponseSchema = z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['contradiction', 'insight', 'add_new_variable']),
      contradictions: z.array(
        z.object({
          contradictoryVariableName: z.string(),
          contradictoryValue: z.string(),
          suggestedValue: z.string(),
          targetVariableType: z.enum([
            KnowledgeGraphNodeType.TECHNOLOGY_DEVELOPMENT,
            KnowledgeGraphNodeType.BUSINESS_DEVELOPMENT,
          ]),
          reason: z.string(),
          targetNodeId: z.string(),
        }),
      ),
      insights: z.array(
        z.object({
          variableName: z.string(),
          insight: z.string(),
          targetVariableType: z.enum([
            KnowledgeGraphNodeType.TECHNOLOGY_DEVELOPMENT,
            KnowledgeGraphNodeType.BUSINESS_DEVELOPMENT,
          ]),
          targetNodeId: z.string(),
        }),
      ),
      newNodes: z.array(
        z.object({
          variableName: z.string(),
          variableHighLevelDescription: z.string(),
          values: z.array(z.string()),
          targetVariableType: z.enum([
            KnowledgeGraphNodeType.TECHNOLOGY_DEVELOPMENT,
            KnowledgeGraphNodeType.BUSINESS_DEVELOPMENT,
          ]),
        }),
      ),
    });
    const CollaboratorAgentId = 'asst_sW1Em2A0u14V4tRM7rTGu44S';

    const response = await this.openaiAssistantService.askAssistant(
      CollaboratorAgentId,
      [
        {
          role: 'user',
          content: `
        Event Title: ${event.title}
        Event Description: ${event.description}
        Event Data: ${event.stringifiedEventData}
        `,
        },
        {
          role: 'user',
          content: `
        Relevant Variable Nodes's data: ${relevantVariableNodesData}
        `,
        },
      ],
      collaboratorAgentResponseSchema,
      undefined,
    );
    console.log(
      `🤖 Collaborator agent response for project ${projectId}: ${JSON.stringify(response).replaceAll('\\', '')}`,
    );
    // ADD NEW NODES
    if (response.newNodes && response.newNodes.length > 0) {
      for (const newNode of response.newNodes) {
        await this.addVariableToKnowledgeGraph(projectId, event.id, newNode);
      }
    }
    // ADD INSIGHTS
    if (response.insights && response.insights.length > 0) {
      for (const insight of response.insights) {
        const variableNodeId = insight.targetNodeId;
        await this.addInsightToVariable(variableNodeId, insight.insight);
      }
    }
    // HANDLE CONTRADICTIONS : LATER

    /// CREATE EVENT LOG NODE WITH NEW NODE, INSIGHT, AND CONTRADICTION
    // Prepare data for the event node according to ProjectActivityLog interface
    const eventLogNodeData: any = {
      id: event.id,
      title: event.title,
      description: event.description,

      newVariables: (response.newNodes || []).map((n: any) => ({
        variableName: n.variableName,
        variableValues: n.values,
        description: n.variableHighLevelDescription,
      })),
      insights: (response.insights || []).map((i: any) => ({
        variableName: i.variableName,
        insight: i.insight,
        targetVariableType: i.targetVariableType,
      })),
      contradictions: (response.contradictions || []).map((c: any) => ({
        contradictoryVariableName: c.contradictoryVariableName,
        contradictoryValue: c.contradictoryValue,
        suggestedValue: c.suggestedValue,
        targetVariableType: c.targetVariableType,
        reason: c.reason,
        status: ContradictionStatus.PENDING,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: null,
      nodeType: KnowledgeGraphNodeType.EVENT_LOG,
    };

    const eventLogNodeCreationQuery = `
      MATCH (p:Project {id: $projectId})-[:Event]->(eventGroup:Event)
      CREATE (e:Event {
      id: $id,
      title: $title,
      description: $description,
   
      newVariables: $newVariables,
      insights: $insights,
      contradictions: $contradictions,
      createdAt: $createdAt,
      updatedAt: $updatedAt,
      nodeType: $nodeType
      })
      MERGE (eventGroup)-[:${edgeLabel}]->(e)
    `;
    await this.neo4jService.executeQuery(eventLogNodeCreationQuery, {
      projectId,
      ...eventLogNodeData,
      newVariables: JSON.stringify(eventLogNodeData.newVariables),
      insights: JSON.stringify(eventLogNodeData.insights),
      contradictions: JSON.stringify(eventLogNodeData.contradictions),
    });
    this.gateway.emitToProject(
      projectId,
      'new-activity-added',
      eventLogNodeData,
    );
  }
  // TODO: ADD VARIABLE TO TECHNOLOGY DEVELOPMENT AND BUSINESS DEVELOPMENT NODE
  async addVariableToKnowledgeGraph(
    projectId: string,
    rootEventId: string,
    variableData: {
      variableName: string;
      variableHighLevelDescription: string;
      values: string[];
      targetVariableType: KnowledgeGraphNodeType;
    },
  ): Promise<void> {
    console.log(
      `🆕 Adding new variable to knowledge graph for event: ${rootEventId}`,
    );
    console.log(
      `🔍 Variable data: \nName: ${variableData.variableName} \nDescription: ${variableData.variableHighLevelDescription} \nValues: ${variableData.values.join(', ')}`,
    );
    console.log('-'.repeat(50));

    const nodeId = crypto.randomUUID();
    let variableNodeCreationQuery = '';
    let params: Record<string, any> = {
      nodeId,
      variableName: variableData.variableName,
      variableDescription: variableData.variableHighLevelDescription,
      values: JSON.stringify(variableData.values),
      projectId,
    };

    if (
      variableData.targetVariableType ===
      KnowledgeGraphNodeType.TECHNOLOGY_DEVELOPMENT
    ) {
      variableNodeCreationQuery = `
      MATCH (p:Project {id: $projectId})-[:TechnologyDevelopment]->(td:TechnologyDevelopment)
      CREATE (v:Variable {id: $nodeId, name: $variableName, description: $variableDescription, values: $values, nodeType: '${KnowledgeGraphNodeType.VARIABLE}'})
      MERGE (td)-[:VARIABLE]->(v)
      WITH v
      MATCH (e:Event {id: $rootEventId, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}'})
      MERGE (e)-[:ADD_VARIABLE]->(v)
      `;
      params.rootEventId = rootEventId;
    } else if (
      variableData.targetVariableType ===
      KnowledgeGraphNodeType.BUSINESS_DEVELOPMENT
    ) {
      variableNodeCreationQuery = `
      MATCH (p:Project {id: $projectId})-[:BusinessDevelopment]->(bd:BusinessDevelopment)
      CREATE (v:Variable {id: $nodeId, name: $variableName, description: $variableDescription, values: $values, nodeType: '${KnowledgeGraphNodeType.VARIABLE}'})
      MERGE (bd)-[:VARIABLE]->(v)
      WITH v
      MATCH (e:Event {id: $rootEventId, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}'})
      MERGE (e)-[:ADD_VARIABLE]->(v)
      `;
      params.rootEventId = rootEventId;
    } else {
      throw new Error('Invalid targetVariableType');
    }

    await this.neo4jService.executeQuery(variableNodeCreationQuery, params);
    console.log(`✅ Variable node created with ID: ${nodeId}`);

    // STEP 2. CREATE EMBEDDING FOR VARIABLE NODE
    console.log(`🔍 Creating embedding for variable node`);
    const embedding = await this.openaiAssistantService.createTextEmbedding(
      `Variable Name: ${variableData.variableName}\nDescription: ${variableData.variableHighLevelDescription}\nValues: ${variableData.values.join(', ')}`,
    );
    console.log(`📊 Embedding created`);
    const embeddingNodeCreationQuery = `
      MATCH (variable:Variable {id: $variableId, nodeType: '${KnowledgeGraphNodeType.VARIABLE}'})
      CREATE (e:Embedding {id: $embeddingId, title: 'Embedding', embedding: $embedding, nodeType: '${KnowledgeGraphNodeType.EMBEDDING}'})
      MERGE (variable)-[:EMBEDDING]->(e)
    `;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Embedding is empty or not an array');
    }
    await this.neo4jService.executeQuery(embeddingNodeCreationQuery, {
      variableId: nodeId,
      embeddingId: nodeId + '-embedding',
      embedding: embedding,
    });
    console.log(`✅ Embedding node created with ID: ${nodeId}-embedding`);
  }

  async addInsightToVariable(
    variableNodeId: string,
    insight: string,
  ): Promise<void> {
    console.log(`🆕 Adding insight to variable node: ${variableNodeId}`);
    console.log(`🔍 Insight: ${insight}`);
    const insightNodeCreationQuery = `
      MATCH (variable:Variable {id: $variableNodeId, nodeType: '${KnowledgeGraphNodeType.VARIABLE}'})
      CREATE (i:Insight {id: $insightId, title: 'INSIGHT', content: $insight, nodeType: '${KnowledgeGraphNodeType.INSIGHT}'})
      MERGE (variable)-[:INSIGHT]->(i)
    `;
    const insightId = crypto.randomUUID();
    await this.neo4jService.executeQuery(insightNodeCreationQuery, {
      variableNodeId,
      insightId,
      insight,
    });
  }

  async findRelevantVariableNodes(
    projectId: string,
    eventId: string,
  ): Promise<
    {
      variableId: string;
      variableName: string;
      variableValues: string[];
      description: string;
      insights: string[];
    }[]
  > {
    console.log(`🔍 Finding relevant variable nodes for event: ${eventId}`);

    const similarityQuery = `
    MATCH (event:Event {id: $eventId, nodeType: '${KnowledgeGraphNodeType.EVENT_LOG}'})-[:EMBEDDING]->(eventEmbedding:Embedding)
    MATCH (project:Project {id: $projectId})-[:TechnologyDevelopment|BusinessDevelopment]->(dev)
    -[:VARIABLE]->(variable:Variable)-[:EMBEDDING]->(variableEmbedding:Embedding)
    
    WITH event, eventEmbedding, variable, variableEmbedding,
         gds.similarity.cosine(eventEmbedding.embedding, variableEmbedding.embedding) AS similarity
    
    WHERE similarity > $similarityThreshold
    
    // Get insights for each variable
    OPTIONAL MATCH (variable)-[:INSIGHT]->(insight:Insight)
    
    WITH variable, similarity, collect(insight.content) as insights
    
    RETURN variable.id as variableId, 
           variable.name as variableName,
           variable.description as description,
           variable.values as values,
           insights,
           similarity
    ORDER BY similarity DESC
  `;

    const similarityThreshold = 0.5;

    const result = await this.neo4jService.executeQuery(similarityQuery, {
      eventId,
      projectId,
      similarityThreshold,
    });

    if (!result || result.length === 0) {
      console.log(
        `📭 No variable nodes found with similarity > ${similarityThreshold} for event: ${eventId}`,
      );
      return [];
    }

    const relevantVariables: {
      variableId: string;
      variableName: string;
      variableValues: string[];
      description: string;
      insights: string[];
    }[] = [];

    for (const record of result) {
      const variableId = record.variableId;
      const variableName = record.variableName;
      const description = record.description || '';
      const similarity = record.similarity;
      const insights = record.insights || [];

      let variableValues: string[] = [];
      try {
        if (record.values) {
          variableValues = JSON.parse(record.values);
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to parse values for variable ${variableId}:`,
          error,
        );
        variableValues = [];
      }

      relevantVariables.push({
        variableId,
        variableName,
        variableValues,
        description,
        insights: insights.filter((insight: any) => insight !== null), // Filter out null insights
      });
    }

    console.log(
      `🎯 Found ${relevantVariables.length} relevant variable nodes with similarity > ${similarityThreshold}`,
    );
    return relevantVariables;
  }
}
