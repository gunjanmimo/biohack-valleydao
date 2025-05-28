import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chalk } from 'chalk';
import { z } from 'zod';
import ora from 'ora';
import {
  Copilot,
  AnalysisQueryState,
  PipelineState,
  ActionableWorkPackage,
} from '../schema/copilot.schema';
import { Project } from '../../project/schema/project.schema';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';
import { PerplexityAssistantService } from 'src/assistant/service/perplexity.assistant.service';
import { CopilotService } from './copilot.service';
import fs from 'fs';
import path from 'path';
import {
  StepGenerationSystemPrompt,
  QueryGenerationSystemPrompt,
  ResearchOutcomeSystemPrompt,
} from '../prompt/copilot-analysis.prompt';
import { QueryGenerationSchema, StepGenerationSchema } from '../dto/output.dto';

@Injectable()
export class CopilotAnalysisService {
  private chalk = new Chalk();

  constructor(
    @InjectRepository(Copilot)
    private copilotRepository: Repository<Copilot>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private openaiAssistantService: OpenaiAssistantService,
    private perplexityAssistantService: PerplexityAssistantService,
    private copilotService: CopilotService,
  ) {}

  private clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[0f');
  }

  private printHeader(title: string): void {
    console.log(this.chalk.cyan('═'.repeat(60)));
    console.log(this.chalk.cyan.bold(`  ${title}`));
    console.log(this.chalk.cyan('═'.repeat(60)));
    console.log();
  }

  private printSubHeader(subtitle: string): void {
    console.log(this.chalk.blue(`── ${subtitle} ──`));
    console.log();
  }

  private printSuccess(message: string): void {
    console.log(this.chalk.green(`✅ ${message}`));
    console.log();
  }

  private printStepCard(index: string, step: any): void {
    console.log(this.chalk.blue(`┌─ Step ${index}`));
    console.log(this.chalk.blue(`│`));
    console.log(this.chalk.blue(`│ `) + this.chalk.white.bold(step.step));
    console.log(this.chalk.blue(`│ `) + this.chalk.gray(step.description));
    console.log(this.chalk.blue(`└─`));
    console.log();
  }

  private printQueryCard(
    queryIndex: string,
    query: any,
    stepName: string,
  ): void {
    const stateColors = {
      [AnalysisQueryState.WAITING]: this.chalk.yellow,
      [AnalysisQueryState.GENERATING]: this.chalk.blue,
      [AnalysisQueryState.DONE]: this.chalk.green,
    };

    const statusIcon = {
      [AnalysisQueryState.WAITING]: '⏳',
      [AnalysisQueryState.GENERATING]: '🔄',
      [AnalysisQueryState.DONE]: '✅',
    };

    console.log(
      this.chalk.blue(
        `┌─ Query ${queryIndex} ${statusIcon[query.state] || '⏳'}`,
      ),
    );
    console.log(this.chalk.blue(`│`));
    console.log(this.chalk.blue(`│ `) + this.chalk.gray(`Focus: ${stepName}`));
    console.log(this.chalk.blue(`│ `) + this.chalk.white(query.query));
    console.log(
      this.chalk.blue(`│ `) +
        stateColors[query.state](`Status: ${query.state}`),
    );
    console.log(this.chalk.blue(`└─`));
    console.log();
  }

  async generateTasks(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('GENERATING PROJECT TASKS');

    const copilot = await this.copilotService.findCopilotByProjectId(projectId);

    if (
      !copilot?.analysis?.steps ||
      Object.keys(copilot?.analysis?.steps || {}).length === 0
    ) {
      const spinner = ora({
        text: 'Analyzing project and generating strategic steps...',
        spinner: 'dots12',
        color: 'cyan',
      }).start();

      const copilotPromptContent =
        await this.copilotService.getCopilotPromptContent(projectId);

      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: StepGenerationSystemPrompt,
          },
          {
            role: 'user',
            content: `Project Content: ${copilotPromptContent}`,
          },
        ],
        StepGenerationSchema,
      );

      const generatedSteps = JSON.parse(response).steps;
      const analysisSteps = {};
      generatedSteps.forEach((step) => {
        analysisSteps[step.stepIndex] = {
          step: step.step,
          description: step.description,
        };
      });

      copilot.analysis.steps = analysisSteps;

      spinner.stop();
      this.printSuccess(
        `Generated ${Object.keys(copilot.analysis.steps).length} strategic steps`,
      );

      await this.copilotRepository.save(copilot);
    }

    this.clearScreen();
    this.printHeader('PROJECT ANALYSIS STEPS');

    Object.entries(copilot.analysis.steps).forEach(([stepIndex, step]) => {
      this.printStepCard(stepIndex, step);
    });

    console.log(
      this.chalk.green.bold(
        `Total Steps: ${Object.keys(copilot.analysis.steps).length}`,
      ),
    );
    console.log();
  }

  async generateResearchQueries(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('GENERATING RESEARCH QUERIES');

    const copilot = await this.copilotService.findCopilotByProjectId(projectId);

    if (Object.keys(copilot?.analysis?.queries).length < 3) {
      const spinner = ora({
        text: 'Creating targeted research queries from analysis steps...',
        spinner: 'circleHalves',
        color: 'blue',
      }).start();

      const steps = copilot?.analysis?.steps;
      const stepContent = `
      Focus Areas:
      ${Object.entries(steps)
        .map(
          ([stepIndex, step]) =>
            `**Focus Area Index${stepIndex}:\n\tStep Name: ${step.step}\n\tStep Description: ${step.description}`,
        )
        .join('\n\n')}  
      `;

      const response = await this.openaiAssistantService.chatCompletion(
        'o3',
        [
          {
            role: 'system',
            content: QueryGenerationSystemPrompt,
          },
          {
            role: 'user',
            content: stepContent,
          },
        ],
        QueryGenerationSchema,
      );

      const queries = JSON.parse(response).generated_queries;

      copilot.analysis.queries = {};
      queries.forEach((query, index) => {
        copilot.analysis.queries[index] = {
          groupIndex: query.focusAreaIndex,
          query: query.query,
          state: AnalysisQueryState.WAITING,
          reportURL: '',
          citation: [],
        };
      });

      await this.copilotRepository.save(copilot);

      spinner.stop();
      this.printSuccess(
        `Generated ${Object.keys(copilot.analysis.queries).length} research queries`,
      );
    }

    this.clearScreen();
    this.printHeader('RESEARCH QUERY OVERVIEW');

    const queries = copilot?.analysis?.queries;
    const groupedQueries: Record<number, { stepName: string; queries: any[] }> =
      {};

    Object.entries(queries).forEach(([queryIndex, query]) => {
      const focusAreaIndex = query.groupIndex;
      if (!groupedQueries[focusAreaIndex]) {
        groupedQueries[focusAreaIndex] = {
          stepName: copilot.analysis.steps[focusAreaIndex].step,
          queries: [],
        };
      }
      groupedQueries[focusAreaIndex].queries.push({
        queryIndex,
        query: query.query,
        state: query.state,
      });
    });

    Object.entries(groupedQueries).forEach(([focusAreaIndex, group]) => {
      this.printSubHeader(`Focus Area ${focusAreaIndex}: ${group.stepName}`);

      group.queries.forEach((query) => {
        this.printQueryCard(query.queryIndex, query, group.stepName);
      });
    });

    console.log(
      this.chalk.green.bold(`Total Queries: ${Object.keys(queries).length}`),
    );
    console.log();
  }

  async runResearchJob(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('EXECUTING RESEARCH PIPELINE');

    const copilot = await this.copilotService.findCopilotByProjectId(projectId);

    const remainingQueries = Object.entries(copilot.analysis.queries).filter(
      ([, query]) => query.state === AnalysisQueryState.WAITING,
    );

    if (!copilot?.analysis.outcomes) {
      copilot.analysis.outcomes = {};
    }

    const extractPlaceholders = (query: string) => {
      const answerNeededMatches = query.match(/\[(.*?)\]/g) || [];
      const answersAvailableMatches = query.match(/\{(.*?)\}/g) || [];

      const answerNeeded = Array.from(
        new Set(
          (() => {
            const result: string[] = [];
            for (let i = 0; i < answerNeededMatches.length; i++) {
              result.push(answerNeededMatches[i].slice(1, -1));
            }
            return result;
          })(),
        ),
      );

      const answersAvailable = Array.from(
        new Set(
          (() => {
            const result: string[] = [];
            for (let i = 0; i < answersAvailableMatches.length; i++) {
              result.push(answersAvailableMatches[i].slice(1, -1));
            }
            return result;
          })(),
        ),
      );

      return { answerNeeded, answersAvailable };
    };

    let processedCount = 0;
    const totalQueries = remainingQueries.length;

    for (const [queryIndex, query] of remainingQueries) {
      this.clearScreen();
      this.printHeader('RESEARCH IN PROGRESS');

      console.log(
        this.chalk.blue(`Progress: ${processedCount + 1}/${totalQueries}`),
      );
      console.log(
        this.chalk.gray(
          `Query ${queryIndex}: ${query.query.substring(0, 80)}...`,
        ),
      );
      console.log();

      const spinner = ora({
        text: `Processing research query ${queryIndex}...`,
        spinner: 'bouncingBar',
        color: 'magenta',
      }).start();

      let queryContent = query.query;
      const { answerNeeded, answersAvailable } =
        extractPlaceholders(queryContent);

      copilot.analysis.queries[queryIndex].state =
        AnalysisQueryState.GENERATING;

      queryContent = queryContent.replace(/\{(.*?)\}/g, (_, varName) => {
        const values = copilot.analysis.outcomes[varName] || [];
        return values.length > 0 ? values.join(', ') : '';
      });

      spinner.text = 'Conducting research via Perplexity AI...';

      const response = await this.perplexityAssistantService.askPerplexity(
        [
          {
            role: 'system',
            content: ResearchOutcomeSystemPrompt,
          },
          {
            role: 'user',
            content: queryContent,
          },
        ],
        'sonar-pro',
        100,
      );

      const messageContent = response.content;

      spinner.text = 'Saving research output...';

      const outputDir = path.join(__dirname, 'research_outputs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFilePath = path.join(
        outputDir,
        `research_output_${queryIndex}.txt`,
      );

      fs.writeFileSync(outputFilePath, messageContent, 'utf8');

      spinner.stop();

      console.log(this.chalk.green(`✅ Query ${queryIndex} completed`));
      console.log(
        this.chalk.gray(`   Output saved: research_output_${queryIndex}.txt`),
      );
      console.log();

      processedCount++;

      // Brief pause to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.clearScreen();
    this.printHeader('RESEARCH PIPELINE COMPLETED');
    this.printSuccess(
      `All ${totalQueries} research queries processed successfully`,
    );
    console.log(
      this.chalk.gray(`Research outputs saved to: ./research_outputs/`),
    );
    console.log();
  }

  async extractVariables(
    content: string,
    targetVariableNames?: string[],
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    const schemaFields: Record<string, any> = {};

    if (targetVariableNames) {
      for (let i = 0; i < targetVariableNames.length; i++) {
        const varName = targetVariableNames[i];
        schemaFields[varName] = z.union([z.string(), z.array(z.string())]);
      }
    }
    const variableExtractionSchema = z.object(schemaFields);

    const researchOutputPrompt = `
INPUT:
The following research text contains information about: ${content}

EXTRACTION TARGETS:
You must extract precise values and contextual information for these specific variables: ${targetVariableNames?.join(', ')}
`;
    const response = await this.openaiAssistantService.formatToJson(
      'gpt-4o',
      variableExtractionSchema,
      researchOutputPrompt,
    );
    const messageContent = response.content;

    if (messageContent) {
      const parsedVariables = JSON.parse(messageContent);

      for (const [key, value] of Object.entries(parsedVariables)) {
        if (Array.isArray(value)) {
          result[key] = value;
        } else {
          result[key] = [value as string];
        }
      }
    }

    return result;
  }

  async runResearchQueries(query: string): Promise<void> {}

  async variableExtractor(
    content: string,
    variables: string[],
  ): Promise<void> {}

  async generatePdfReports(
    content: string,
    variables: Record<string, string[]>,
  ): Promise<void> {}

  async generateFinalReports(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('GENERATING FINAL REPORT');

    const copilot = await this.copilotService.findCopilotByProjectId(projectId);

    if (!copilot?.analysis?.finalReportURL) {
      const spinner = ora({
        text: 'Synthesizing research findings into comprehensive report...',
        spinner: 'clock',
        color: 'green',
      }).start();

      const queries = copilot?.analysis?.queries;
      const queryContent = Object.entries(queries)
        .map(
          ([queryIndex, query]) =>
            `**Query Index ${queryIndex}:\n\tQuery: ${query.query}\n\tContent: ${
              query.content || 'No content available'
            }`,
        )
        .join('\n\n');

      spinner.text = 'Analyzing research data with GPT-4...';

      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o',
        [
          {
            role: 'system',
            content: `Generate a final report for the project based on the following queries and their content:\n\n${queryContent}`,
          },
          {
            role: 'user',
            content: queryContent,
          },
        ],
      );

      const finalReportContent = response;

      spinner.text = 'Saving final report...';

      const outputDir = path.join(__dirname, 'final_reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFilePath = path.join(
        outputDir,
        `final_report_${projectId}.txt`,
      );

      fs.writeFileSync(outputFilePath, finalReportContent, 'utf8');

      spinner.stop();

      this.clearScreen();
      this.printHeader('FINAL REPORT GENERATED');
      this.printSuccess('Comprehensive project report created successfully');

      console.log(this.chalk.blue('📄 Report Details:'));
      console.log(this.chalk.gray(`   Project ID: ${projectId}`));
      console.log(this.chalk.gray(`   File: final_report_${projectId}.txt`));
      console.log(this.chalk.gray(`   Location: ./final_reports/`));
      console.log();

      console.log(
        this.chalk.green.bold('🎉 Analysis pipeline completed successfully!'),
      );
      console.log();
    }
  }
}
