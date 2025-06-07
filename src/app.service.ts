import fs from 'fs';
import path from 'path';

import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import ora from 'ora';
import inquirer from 'inquirer';
import { ProjectService } from './project/service/project.service';
import { TdService } from './td/service/td.service';
import { BdService } from './bd/service/bd.service';
import { AriService } from './project/service/ari.service';
import figlet from 'figlet';
interface AssistantToken {
  openaiAPIKey: string;
  perplexityAPIKey: string;
}

@Injectable()
export class AppService {
  private readonly ROOT_DIR = '.valleydao';
  private readonly TOKEN_FILE = 'assistant_token.json';
  private readonly DB_FILE = 'valleydao.db';
  private readonly DB_DIR = 'db';
  private readonly DB_PATH = path.join(
    this.ROOT_DIR,
    this.DB_DIR,
    this.DB_FILE,
  );
  private readonly TOKEN_PATH = path.join(this.ROOT_DIR, this.TOKEN_FILE);

  private OPENAI_API_KEY: string;
  private PERPLEXITY_API_KEY: string;

  constructor(
    private readonly projectService: ProjectService,
    private readonly tdService: TdService,
    private readonly bdService: BdService,
    private readonly ariService: AriService,
  ) {}

  async loadAssistantToken(): Promise<void> {
    await fs.promises.mkdir(this.ROOT_DIR, { recursive: true });
    const tokenFilePath = path.join(this.ROOT_DIR, this.TOKEN_FILE);
    const tokenExist = fs.existsSync(tokenFilePath);
    if (!tokenExist) {
      await inquirer
        .prompt<AssistantToken>([
          {
            type: 'input',
            name: 'openaiAPIKey',
            message: "What's your OpenAI API key?",
          },
          {
            type: 'input',
            name: 'perplexityAPIKey',
            message: "What's your Perplex API key?",
          },
        ])
        .then(async (answers) => {
          const tokenData = {
            openaiAPIKey: answers.openaiAPIKey,
            perplexityAPIKey: answers.perplexityAPIKey,
          };
          const spinner = ora('Storing tokens...\n').start();

          await fs.promises.mkdir(this.ROOT_DIR, { recursive: true });
          await fs.promises.writeFile(
            this.TOKEN_PATH,
            JSON.stringify(tokenData, null, 2),
            'utf-8',
          );
          // INJECT THE TOKENS INTO THE ENVIRONMENT VARIABLES
          this.OPENAI_API_KEY = tokenData.openaiAPIKey;
          this.PERPLEXITY_API_KEY = tokenData.perplexityAPIKey;
          process.env.OPENAI_API_KEY = this.OPENAI_API_KEY;
          process.env.PERPLEXITY_API_KEY = this.PERPLEXITY_API_KEY;
          spinner.stop();
        });
    }
    const spinner = ora('Loading assistant tokens...\n').start();
    const tokenData = await fs.promises.readFile(this.TOKEN_PATH, 'utf-8');
    const parsedData = JSON.parse(tokenData) as AssistantToken;
    const parsedTokenData: AssistantToken = {
      openaiAPIKey: parsedData.openaiAPIKey || '',
      perplexityAPIKey: parsedData.perplexityAPIKey || '',
    };
    this.OPENAI_API_KEY = parsedTokenData.openaiAPIKey;
    this.PERPLEXITY_API_KEY = parsedTokenData.perplexityAPIKey;
    process.env.OPENAI_API_KEY = this.OPENAI_API_KEY;
    process.env.PERPLEXITY_API_KEY = this.PERPLEXITY_API_KEY;
    spinner.stop();
  }

  @Command({
    command: 'run',
    describe: 'ValleyDAO Project Management',
  })
  async pipeline(): Promise<void> {
    console.log(
      figlet.textSync('ValleyDAO CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    );

    await this.loadAssistantToken();
    const selectedProjectId = await this.projectService.projectSelector();
    const selectedPipeline = await inquirer.prompt<{
      pipeline: 'bd' | 'td' | 'ari';
    }>([
      {
        type: 'list',
        name: 'pipeline',
        message: 'Select a pipeline:',
        choices: [
          { name: 'Business Development', value: 'bd' },
          { name: 'Technology Development', value: 'td' },
          { name: 'Copilot Research Wizard', value: 'ari' },
        ],
      },
    ]);
    const pipeline = selectedPipeline.pipeline;
    if (pipeline === 'td' && selectedProjectId) {
      await this.tdService.tdPipeline(selectedProjectId);
    }
    if (pipeline === 'bd' && selectedProjectId) {
      await this.bdService.bdPipeline(selectedProjectId);
    }
    if (pipeline === 'ari' && selectedProjectId) {
      await this.ariService.startConversation(selectedProjectId);
    }
  }
}
