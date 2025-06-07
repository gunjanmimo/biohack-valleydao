import { Injectable } from '@nestjs/common';
import { CopilotService } from 'src/td/service/copilot.service';
import { ProjectService } from 'src/project/service/project.service';
import { BdService } from 'src/bd/service/bd.service';
import { TdService } from 'src/td/service/td.service';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';
import {
  ManagerAgentPrompt,
  DetailsAgentPrompt,
  BusinessAgentPrompt,
  ResearchAgentPrompt,
  SynthesisAgentPrompt,
} from '../prompt/td.prompt';
import { z } from 'zod';
import ora from 'ora';

const readline = require('readline');

@Injectable()
export class AriService {
  constructor(
    private copilotService: CopilotService,
    private projectService: ProjectService,
    private bdService: BdService,
    private tdService: TdService,
    private openaiAssistantService: OpenaiAssistantService,
  ) {}

  async askQuestion(projectId: string, question: string): Promise<string> {
    const spinner = ora('Processing your question...').start();

    try {
      const managerAgentResponse = await this.callManagerAgent(question);
      console.log(
        `\nManager Agent Response:\n${JSON.stringify(
          managerAgentResponse,
          null,
          2,
        )}\n`,
      );

      let completeResponse = '';

      // Process each agent recommendation from the manager
      for (const agent of managerAgentResponse) {
        console.log(
          `\nProcessing agent: ${agent.agent} with query: ${agent.agentQuery}`,
        );

        try {
          if (agent.agent === 'details') {
            const detailsResponse = await this.callDetailsAgent(
              projectId,
              agent.agentQuery,
            );
            completeResponse += `Details Agent Response: ${detailsResponse}\n\n`;
          } else if (agent.agent === 'business') {
            const businessResponse = await this.callBusinessAgent(
              projectId,
              agent.agentQuery,
            );
            completeResponse += `Business Agent Response: ${businessResponse}\n\n`;
          } else if (agent.agent === 'research') {
            const researchResponse = await this.callResearchAgent(
              projectId,
              agent.agentQuery,
            );
            completeResponse += `Research Agent Response: ${researchResponse}\n\n`;
          }
        } catch (error) {
          console.error(`Error calling ${agent.agent} agent:`, error);
          completeResponse += `Error from ${agent.agent} agent: ${error.message}\n\n`;
        }
      }

      console.log(`\nComplete Response from Agents:\n${completeResponse}\n`);

      // Only call synthesis agent if we have responses from other agents
      let finalResponse: string;
      if (completeResponse.trim()) {
        finalResponse = await this.callSynthesisAgent(completeResponse);
      } else {
        finalResponse =
          "I apologize, but I wasn't able to gather information from the specialized agents to answer your question. Please try rephrasing your question or check the system configuration.";
      }

      spinner.stop();
      return finalResponse;
    } catch (error) {
      spinner.stop();
      console.error('Error in askQuestion:', error);
      throw error;
    }
  }

  async callManagerAgent(question: string): Promise<
    {
      agent: string;
      focusAreas: string[];
      agentQuery: string;
    }[]
  > {
    const responseSchema = z.object({
      response: z.array(
        z.object({
          agent: z.enum(['details', 'business', 'research']),
          focusAreas: z.array(z.string()),
          agentQuery: z.string(),
        }),
      ),
    });

    try {
      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: ManagerAgentPrompt,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        responseSchema,
      );

      const parsedResponse = JSON.parse(response);
      return parsedResponse.response;
    } catch (error) {
      console.error('Error in callManagerAgent:', error);
      throw new Error(`Manager agent failed: ${error.message}`);
    }
  }

  async callDetailsAgent(projectId: string, query: string): Promise<string> {
    try {
      const projectPromptContent =
        await this.projectService.getProjectPromptContent(projectId);

      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: DetailsAgentPrompt,
          },
          {
            role: 'user',
            content: `Query: ${query}`,
          },
          {
            role: 'user',
            content: projectPromptContent,
          },
        ],
      );

      console.log(`\nDetails Agent Response: \n ${response}\n`);
      return response;
    } catch (error) {
      console.error('Error in callDetailsAgent:', error);
      throw new Error(`Details agent failed: ${error.message}`);
    }
  }

  async callBusinessAgent(projectId: string, query: string): Promise<string> {
    try {
      const businessPromptContent =
        await this.bdService.getBusinessPromptContent(projectId);

      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: BusinessAgentPrompt,
          },
          {
            role: 'user',
            content: `Query: ${query}`,
          },
          {
            role: 'user',
            content: businessPromptContent,
          },
        ],
      );

      console.log(`\nBusiness Agent Response: \n ${response}\n`);
      return response;
    } catch (error) {
      console.error('Error in callBusinessAgent:', error);
      throw new Error(`Business agent failed: ${error.message}`);
    }
  }

  async callResearchAgent(projectId: string, query: string): Promise<string> {
    try {
      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: ResearchAgentPrompt,
          },
          {
            role: 'user',
            content: `Query: ${query}`,
          },
        ],
      );

      console.log(`\nResearch Agent Response: \n ${response}\n`);
      return response;
    } catch (error) {
      console.error('Error in callResearchAgent:', error);
      throw new Error(`Research agent failed: ${error.message}`);
    }
  }

  async callSynthesisAgent(content: string): Promise<string> {
    const spinner = ora('Calling Synthesis Agent...').start();

    try {
      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: SynthesisAgentPrompt,
          },
          {
            role: 'user',
            content: content,
          },
        ],
      );

      spinner.stop();
      console.log(`\nSynthesis Agent Response: \n ${response}\n`);
      return response;
    } catch (error) {
      spinner.stop();
      console.error('Error in callSynthesisAgent:', error);
      throw new Error(`Synthesis agent failed: ${error.message}`);
    }
  }

  async startConversation(projectId: string): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askUserQuestion = async () => {
      rl.question(
        'Enter your question (or type "quit" to exit): ',
        async (query) => {
          if (query.toLowerCase() === 'quit') {
            console.log('Ending conversation.');
            rl.close();
            return;
          }

          // Check if query is empty or just whitespace
          if (!query.trim()) {
            console.log('Please enter a valid question.');
            askUserQuestion();
            return;
          }

          try {
            const answer = await this.askQuestion(projectId, query);
            console.log('\nAnswer:', answer, '\n');
            askUserQuestion(); // Ask for next question
          } catch (error) {
            console.error('Error getting answer:', error);
            askUserQuestion(); // Continue despite error
          }
        },
      );
    };

    console.log('Starting conversation. Type "quit" to exit at any time.');
    await askUserQuestion();
  }
}
