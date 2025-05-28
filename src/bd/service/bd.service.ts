import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ora from 'ora';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { Business, CRMFilter } from '../schema/business.schema';
import { BusinessPersona } from '../schema/business-persona.schema';
import { MarketSegment } from '../schema/market-segment.schema';
import { TargetMarket } from '../schema/target-market.schema';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';
import { PerplexityAssistantService } from 'src/assistant/service/perplexity.assistant.service';
import { ProjectService } from 'src/project/service/project.service';
import {
  TargetMarketIdentificationSchema,
  TargetMarketAnalysisSchema,
  MarketSegmentIdentificationSchema,
  CustomerPersonaGenerationSchema,
  CRMFilterGenerationSchema,
  CRMResearchGenerationSchema,
  BusinessModelCanvasSchema,
  CostBasedPricingModelSchema,
} from '../dto/output.dto';
import {
  TargetMarketIdentificationPrompt,
  TargetMarketAnalysisPrompt,
  MarketSegmentIdentificationPrompt,
  CustomerPersonaGenerationPrompt,
  CRMFilterGenerationPrompt,
  CutomerResearchGenerationPrompt,
  BusinessModelGenerationPrompt,
  CostBasedPricingModelGenerationPrompt,
} from '../prompt/bd.prompt';

@Injectable()
export class BdService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessPersona)
    private businessPersonaRepository: Repository<BusinessPersona>,
    @InjectRepository(MarketSegment)
    private marketSegmentRepository: Repository<MarketSegment>,
    @InjectRepository(TargetMarket)
    private targetMarketRepository: Repository<TargetMarket>,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly perplexityAssistantService: PerplexityAssistantService,
    private readonly projectService: ProjectService,
  ) {}

  private clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[0f');
  }

  private printHeader(title: string): void {
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.cyan.bold(`  ${title}`));
    console.log(chalk.cyan('═'.repeat(80)));
    console.log();
  }

  private printSubHeader(subtitle: string): void {
    console.log(chalk.blue(`── ${subtitle} ──`));
    console.log();
  }

  private printSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
    console.log();
  }

  private printWelcomeBanner(): void {
    this.clearScreen();
    console.log(
      chalk.cyan(
        figlet.textSync('ValleyDAO - Business Development', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default',
        }),
      ),
    );
    console.log(
      chalk.gray('Building strategic market insights for your project'),
    );
    console.log(chalk.cyan('═'.repeat(80)));
    console.log();
  }

  private async askToContinue(
    stepName: string,
    nextStep: string,
    currentStep: number,
    totalSteps: number,
  ): Promise<boolean> {
    console.log(chalk.blue('─'.repeat(80)));
    console.log(
      chalk.yellow(`Step ${currentStep}/${totalSteps} completed: ${stepName}`),
    );
    console.log(chalk.gray(`Next: ${nextStep}`));
    console.log();

    const answer = await inquirer.prompt<{ continue: boolean }>([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue to the next step?',
        default: true,
      },
    ]);

    return answer.continue;
  }

  private printPipelineExit(completedSteps: string[]): void {
    this.clearScreen();
    this.printHeader('PIPELINE STOPPED');

    console.log(chalk.yellow('📋 Completed Steps:'));
    completedSteps.forEach((step, index) => {
      console.log(chalk.green(`  ${index + 1}. ✅ ${step}`));
    });

    console.log();
    console.log(
      chalk.blue(
        'You can resume the pipeline anytime by running the command again.',
      ),
    );
    console.log(chalk.gray('Your progress has been saved to the database.'));
    console.log();
  }

  private printMarketCard(market: TargetMarket, index: number): void {
    console.log(
      chalk.blue(`┌─ Market ${index + 1} ${market.selected ? '✅' : '⚪'}`),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.white.bold(market.name));
    console.log(chalk.blue(`│ `) + chalk.gray(market.description));
    if (market.marketSize) {
      console.log(
        chalk.blue(`│ `) +
          chalk.yellow(
            `Size: ${market.marketSize.value} ${market.marketSize.currency} (${market.marketSize.unit})`,
          ),
      );
    }
    if (market.cagr) {
      console.log(
        chalk.blue(`│ `) +
          chalk.yellow(
            `CAGR: ${market.cagr.ratePercent}% (${market.cagr.period.startYear}-${market.cagr.period.endYear})`,
          ),
      );
    }
    console.log(chalk.blue(`└─`));
    console.log();
  }

  private printSegmentCard(segment: MarketSegment, index: number): void {
    const totalQuestions = segment.questionAnswers.length;
    const sumOfScores = segment.questionAnswers.reduce(
      (acc, qa) => acc + (qa.score || 0),
      0,
    );
    const productFitScore = `${sumOfScores}/${totalQuestions * 5}`;
    const scorePercent = Math.round((sumOfScores / (totalQuestions * 5)) * 100);

    console.log(chalk.blue(`┌─ Segment ${index + 1}`));
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.white.bold(segment.title));
    console.log(chalk.blue(`│ `) + chalk.gray(segment.description));
    console.log(
      chalk.blue(`│ `) + chalk.yellow(`Size: ${segment.segmentSize}`),
    );
    console.log(
      chalk.blue(`│ `) +
        chalk.green(`Fit Score: ${productFitScore} (${scorePercent}%)`),
    );
    console.log(chalk.blue(`└─`));
    console.log();
  }

  private printPersonaCard(persona: BusinessPersona): void {
    console.log(chalk.blue(`┌─ Customer Persona`));
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.white.bold(`👤 ${persona.name}`));
    console.log(chalk.blue(`│ `) + chalk.yellow(`💼 ${persona.occupation}`));
    console.log(
      chalk.blue(`│ `) +
        chalk.gray(`${persona.gender} • ${persona.maritalStatus}`),
    );
    console.log(chalk.blue(`│`));
    console.log(
      chalk.blue(`│ `) +
        chalk.cyan(`🧠 Personality: ${persona.personalityType}`),
    );
    console.log(
      chalk.blue(`│ `) +
        chalk.cyan(`🎯 Key Traits: ${persona.keyTraits.join(', ')}`),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.magenta(`💡 Purchase Drivers:`));
    persona.purchaseDrivers.forEach((driver) => {
      console.log(chalk.blue(`│   `) + chalk.gray(`• ${driver}`));
    });
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.red(`⚠️  Pain Points:`));
    persona.painPoints.forEach((pain) => {
      console.log(chalk.blue(`│   `) + chalk.gray(`• ${pain}`));
    });
    console.log(chalk.blue(`│`));
    console.log(
      chalk.blue(`│ `) +
        chalk.green(
          `🛒 Purchase Frequency: ${persona.purchaseFrequency.interval} ${persona.purchaseFrequency.period}`,
        ),
    );
    if (persona.purchaseFrequency.reason) {
      console.log(
        chalk.blue(`│   `) +
          chalk.gray(`Reason: ${persona.purchaseFrequency.reason}`),
      );
    }
    console.log(chalk.blue(`│`));
    console.log(
      chalk.blue(`│ `) +
        chalk.blue(
          `🌐 Community Touchpoints: ${persona.communityTouchpoints.join(', ')}`,
        ),
    );
    console.log(
      chalk.blue(`│ `) +
        chalk.blue(
          `❤️  Preferred Brands: ${persona.preferredBrands.join(', ')}`,
        ),
    );
    console.log(chalk.blue(`└─`));
    console.log();
  }

  private printBusinessModelCard(model: any, index: number): void {
    const isSelected = model.selected || false;
    const selectionIcon = isSelected ? '✅' : '⚪';
    const titleColor = isSelected ? chalk.green.bold : chalk.white.bold;

    console.log(chalk.blue(`┌─ Business Model ${index + 1} ${selectionIcon}`));
    console.log(chalk.blue(`│`));
    console.log(
      chalk.blue(`│ `) + titleColor(`🏢 ${model.businessModelTitle}`),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.cyan(`📋 Overview:`));
    console.log(
      chalk.blue(`│   `) + chalk.gray(this.truncateText(model.overview, 80)),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.magenta(`🚀 Implementation:`));
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(this.truncateText(model.implementationDetails, 80)),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.yellow(`🏆 Competition & Defense:`));
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(this.truncateText(model.competitionAndDefensibility, 80)),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.red(`⚠️  Risk Analysis:`));
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(this.truncateText(model.riskAnalysis, 80)),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.green(`👥 Customer Metrics:`));
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(`Volume: ${model.customerDescription.volume}`),
    );
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(`Value: ${model.customerDescription.value}`),
    );
    console.log(
      chalk.blue(`│   `) +
        chalk.gray(`Churn: ${model.customerDescription.churn}`),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.blue(`📊 Status: ${model.status}`));
    if (model.feedback) {
      console.log(
        chalk.blue(`│ `) +
          chalk.cyan(`💬 Feedback: ${this.truncateText(model.feedback, 60)}`),
      );
    }
    if (isSelected) {
      console.log(chalk.blue(`│ `) + chalk.green.bold(`🎯 SELECTED MODEL`));
    }
    console.log(chalk.blue(`└─`));
    console.log();
  }

  private printPricingCard(costModel: any, index: number): void {
    console.log(
      chalk.blue(`┌─ Pricing Model ${index + 1} (${costModel.scale})`),
    );
    console.log(chalk.blue(`│`));
    console.log(
      chalk.blue(`│ `) + chalk.white.bold(`📊 Scale: ${costModel.scale}`),
    );
    console.log(chalk.blue(`│`));

    const totalCost = costModel.costItems.reduce((sum: number, item: any) => {
      // Handle both string and number types for costUSD
      const cost =
        typeof item.costUSD === 'string'
          ? parseFloat(item.costUSD.replace(/[$,]/g, ''))
          : item.costUSD;
      return sum + (cost || 0);
    }, 0);

    console.log(
      chalk.blue(`│ `) +
        chalk.green.bold(`💰 Total Cost: $${totalCost.toLocaleString()}`),
    );
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.cyan(`🏷️  Cost Breakdown:`));

    costModel.costItems.forEach((item: any) => {
      console.log(chalk.blue(`│   `) + chalk.yellow(`• ${item.type}:`));

      // Format costUSD as currency regardless of whether it's string or number
      const formattedCost =
        typeof item.costUSD === 'string'
          ? item.costUSD
          : `$${item.costUSD.toLocaleString()}`;

      console.log(
        chalk.blue(`│     `) +
          chalk.white(`${item.itemName} - ${formattedCost}`),
      );
      console.log(
        chalk.blue(`│     `) +
          chalk.gray(this.truncateText(item.itemDescription, 60)),
      );
    });

    console.log(chalk.blue(`└─`));
    console.log();
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return 'N/A';
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  }

  // Consistent spinner creation method
  private createSpinner(text: string): any {
    return ora({
      text,
      spinner: 'dots12', // Consistent animation for all steps
      color: 'cyan',
    });
  }

  async getBusinessByProjectId(projectId: string): Promise<Business> {
    let business = await this.businessRepository.findOne({
      where: { id: projectId },
      relations: ['targetMarkets'],
    });
    if (!business) {
      business = new Business();
      business.id = projectId;
      business.targetMarkets = [];
      business = await this.businessRepository.save(business);
    }
    return business;
  }

  async bdPipeline(projectId: string): Promise<void> {
    this.printWelcomeBanner();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const completedSteps: string[] = [];
    const totalSteps = 8;

    // Step 1: Target Market Identification
    await this.identifyTargetMarket(projectId);
    completedSteps.push('Target Market Identification');

    const continue1 = await this.askToContinue(
      'Target Market Identification',
      'Target Market Selection & Analysis',
      1,
      totalSteps,
    );
    if (!continue1) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 2: Target Markets Selection
    await this.targetMarketsSelection(projectId);
    completedSteps.push('Target Market Selection & Analysis');

    const continue2 = await this.askToContinue(
      'Target Market Selection & Analysis',
      'Market of Interest Selection',
      2,
      totalSteps,
    );
    if (!continue2) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 3: Market of Interest Selection
    await this.selectMarketOfInterest(projectId);
    completedSteps.push('Market of Interest Selection');

    const continue3 = await this.askToContinue(
      'Market of Interest Selection',
      'Market Segment Identification',
      3,
      totalSteps,
    );
    if (!continue3) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 4: Market Segment Identification
    await this.identifyMarketSegment(projectId);
    completedSteps.push('Market Segment Identification');

    const continue4 = await this.askToContinue(
      'Market Segment Identification',
      'Customer Persona Generation',
      4,
      totalSteps,
    );
    if (!continue4) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 5: Customer Persona Generation
    await this.generateCustomerPersona(projectId);
    completedSteps.push('Customer Persona Generation');

    const continue5 = await this.askToContinue(
      'Customer Persona Generation',
      'Customer CRM & Research',
      5,
      totalSteps,
    );
    if (!continue5) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 6: Customer CRM
    await this.customerCRM(projectId);
    completedSteps.push('Customer CRM & Research');

    const continue6 = await this.askToContinue(
      'Customer CRM & Research',
      'Business Model Canvas',
      6,
      totalSteps,
    );
    if (!continue6) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 7: Business Model Canvas
    await this.businessModelCanvas(projectId);
    completedSteps.push('Business Model Canvas');

    const continue7 = await this.askToContinue(
      'Business Model Canvas',
      'Pricing Strategy',
      7,
      totalSteps,
    );
    if (!continue7) {
      this.printPipelineExit(completedSteps);
      return;
    }

    // Step 8: Pricing Strategy
    await this.pricingStrategy(projectId);
    completedSteps.push('Pricing Strategy');

    // Final completion
    this.clearScreen();
    this.printHeader('🎉 BUSINESS DEVELOPMENT PIPELINE COMPLETED');

    console.log(chalk.green('All steps completed successfully:'));
    completedSteps.forEach((step, index) => {
      console.log(chalk.green(`  ${index + 1}. ✅ ${step}`));
    });

    console.log();
    console.log(
      chalk.cyan.bold('Your comprehensive business analysis is now complete!'),
    );
    console.log(
      chalk.gray(
        'All data has been saved and is ready for strategic implementation.',
      ),
    );
    console.log();
  }

  async identifyTargetMarket(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('TARGET MARKET IDENTIFICATION');

    const business = await this.getBusinessByProjectId(projectId);

    if (business.targetMarkets?.length === 0) {
      const spinner = this.createSpinner(
        'Analyzing your project to identify potential target markets...',
      ).start();

      const projectPromptContent =
        await this.projectService.getProjectPromptContent(projectId);

      spinner.text = 'Processing with GPT-4 Mini...';

      const response = await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: TargetMarketIdentificationPrompt,
          },
          {
            role: 'user',
            content: projectPromptContent,
          },
        ],
        TargetMarketIdentificationSchema,
      );

      const targetMarketData = JSON.parse(response).targetMarkets;

      spinner.text = 'Saving target markets to database...';

      for (const market of targetMarketData) {
        const targetMarket = new TargetMarket();
        targetMarket.name = market.name;
        targetMarket.description = market.description;
        targetMarket.businessId = business.id;
        await this.targetMarketRepository.save(targetMarket);
      }

      spinner.stop();
      this.printSuccess(
        `Discovered ${targetMarketData.length} potential target markets`,
      );
    }

    const targetMarkets = await this.targetMarketRepository.find({
      where: { businessId: business.id },
    });

    this.clearScreen();
    this.printHeader('DISCOVERED TARGET MARKETS');

    targetMarkets.forEach((market, index) => {
      this.printMarketCard(market, index);
    });

    console.log(
      chalk.green.bold(`Total Markets Identified: ${targetMarkets.length}`),
    );
    console.log();

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async selectTargetMarket(targetMarketId: string): Promise<void> {
    const targetMarket = await this.targetMarketRepository.findOne({
      where: { id: targetMarketId },
    });
    if (!targetMarket) {
      console.log(
        chalk.red(`Target market with ID ${targetMarketId} not found.`),
      );
      return;
    }
    targetMarket.selected = true;
    await this.targetMarketRepository.save(targetMarket);
  }

  async deSelectTargetMarket(targetMarketId: string): Promise<void> {
    const targetMarket = await this.targetMarketRepository.findOne({
      where: { id: targetMarketId },
    });
    if (!targetMarket) {
      console.log(
        chalk.red(`Target market with ID ${targetMarketId} not found.`),
      );
      return;
    }
    targetMarket.selected = false;
    await this.targetMarketRepository.save(targetMarket);
  }

  async targetMarketsSelection(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('TARGET MARKET SELECTION');

    const business = await this.getBusinessByProjectId(projectId);
    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    const targetMarkets = await this.targetMarketRepository.find({
      where: { businessId: business.id },
    });

    const selectedMarkets = targetMarkets.filter((tm) => tm.selected);

    if (selectedMarkets.length < 3) {
      this.printSubHeader('Select Markets for Deep Analysis');
      console.log(
        chalk.yellow(
          'Please select at least 3 target markets for comprehensive analysis.',
        ),
      );
      console.log();

      const marketChoices = targetMarkets.map((market) => ({
        name: `${market.name} - ${market.description.substring(0, 60)}...`,
        value: market.id,
        checked: market.selected,
      }));

      const answers = await inquirer.prompt<{
        selectedMarkets: string[];
      }>([
        {
          type: 'checkbox',
          name: 'selectedMarkets',
          message: 'Select target markets for analysis:',
          choices: marketChoices,
          validate: (answer) => {
            if (answer.length < 3) {
              return 'Please select at least 3 target markets for analysis.';
            }
            return true;
          },
        },
      ]);

      const selectedMarketIds = answers.selectedMarkets;

      this.clearScreen();
      this.printHeader('PROCESSING MARKET SELECTIONS');

      await Promise.all(
        targetMarkets.map((market) =>
          market.selected && !selectedMarketIds.includes(market.id)
            ? this.deSelectTargetMarket(market.id)
            : Promise.resolve(),
        ),
      );

      let processedCount = 0;
      const totalMarkets = selectedMarketIds.length;

      for (const marketId of selectedMarketIds) {
        await this.selectTargetMarket(marketId);

        this.clearScreen();
        this.printHeader('ANALYZING SELECTED MARKETS');
        console.log(
          chalk.blue(`Progress: ${processedCount + 1}/${totalMarkets}`),
        );
        console.log();

        await this.analyzeSelectedTargetMarket(marketId);
        processedCount++;
      }

      this.clearScreen();
      this.printHeader('MARKET SELECTION COMPLETED');
      this.printSuccess(
        `Successfully analyzed ${selectedMarketIds.length} target markets`,
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async analyzeSelectedTargetMarket(marketId: string): Promise<void> {
    const market = await this.targetMarketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      console.log(chalk.red(`Target market with ID ${marketId} not found.`));
      return;
    }

    if (market?.cagr && market?.marketSize) {
      console.log(
        chalk.green(
          `✅ Target market ${market.name} already analyzed. Skipping...`,
        ),
      );
      this.printMarketAnalysisCard(market, 0);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return;
    }

    console.log(
      chalk.blue(`🔍 Applying Market Analysis Framework to: ${market.name}`),
    );
    console.log(
      chalk.gray(
        `Analyzing: Market Size, CAGR, Competition, Opportunities, Challenges`,
      ),
    );
    console.log();

    const spinner = this.createSpinner(
      `Conducting deep market analysis for: ${market.name}`,
    ).start();

    const marketPromptContent = `
    Target Market Name : ${market?.name}\n
    Target Market Description : ${market?.description}\n
    `;

    spinner.text = 'Researching market data via Perplexity AI...';

    const response = await this.perplexityAssistantService.askPerplexity(
      [
        {
          role: 'system',
          content: TargetMarketAnalysisPrompt,
        },
        {
          role: 'user',
          content: marketPromptContent,
        },
      ],
      'sonar-pro',
      1000,
    );

    spinner.text = 'Processing market analysis data...';

    const content = response.content;
    const parsedData = await this.openaiAssistantService.formatToJson(
      content,
      TargetMarketAnalysisSchema,
    );

    market.cagr = parsedData.cagr;
    market.marketSize = parsedData.marketSize;
    market.keyHighlights = parsedData.keyHighlights;
    market.saturation = parsedData.saturation;
    market.opportunities = parsedData.opportunities;
    market.challenges = parsedData.challenges;
    market.sources = parsedData.sources;

    await this.targetMarketRepository.save(market);

    spinner.stop();

    console.log(chalk.green(`✅ Analysis completed for: ${market.name}`));
    console.log();

    this.printMarketAnalysisCard(market, 0);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async selectMarketOfInterest(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('MARKET OF INTEREST SELECTION');

    const business = await this.getBusinessByProjectId(projectId);
    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    if (business.selectedTargetMarketId) {
      const targetMarket = await this.targetMarketRepository.findOne({
        where: { id: business.selectedTargetMarketId },
      });
      if (!targetMarket) {
        console.log(
          chalk.red(
            `Selected target market with ID ${business.selectedTargetMarketId} not found.`,
          ),
        );
        return;
      }
      console.log(
        chalk.yellow(
          `✅ Market of interest already selected: ${targetMarket.name}`,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return;
    }

    const selectedMarkets = await this.targetMarketRepository.find({
      where: { businessId: projectId, selected: true },
    });

    if (selectedMarkets.length === 0) {
      console.log(
        chalk.red(
          'No target markets selected for analysis. Please select at least one target market.',
        ),
      );
      return;
    }

    this.printSubHeader('Market Analysis Comparison');

    const table = new Table({
      head: [
        chalk.white.bold('Market Name'),
        chalk.white.bold('Market Size'),
        chalk.white.bold('CAGR'),
        chalk.white.bold('Stage'),
        chalk.white.bold('Competition'),
        chalk.white.bold('Opportunity'),
      ],
      style: {
        head: [],
        border: ['cyan'],
      },
    });

    selectedMarkets.forEach((market) => {
      table.push([
        market.name,
        `${market.marketSize?.value} ${market.marketSize?.currency}\n(${market.marketSize?.unit})`,
        `${market.cagr?.ratePercent}%\n(${market.cagr?.period.startYear}-${market.cagr?.period.endYear})`,
        market.saturation.stage,
        market.saturation.competitionLevel,
        market.saturation.opportunityLevel,
      ]);
    });

    console.log(table.toString());
    console.log();

    const answers = await inquirer.prompt<{
      marketOfInterest: string;
    }>([
      {
        type: 'list',
        name: 'marketOfInterest',
        message: 'Select your primary market of interest:',
        choices: selectedMarkets.map((market) => ({
          name: `${market.name} (${market.marketSize?.value} ${market.marketSize?.currency}, ${market.cagr?.ratePercent}% CAGR)`,
          value: market.id,
        })),
      },
    ]);

    const selectedMarketId = answers.marketOfInterest;
    business.selectedTargetMarketId = selectedMarketId;
    await this.businessRepository.save(business);

    this.clearScreen();
    this.printHeader('MARKET SELECTION CONFIRMED');

    const selectedMarket = selectedMarkets.find(
      (m) => m.id === selectedMarketId,
    );
    this.printMarketCard(selectedMarket!, 0);

    this.printSuccess(
      'Market of interest has been locked in for further analysis',
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async identifyMarketSegment(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('MARKET SEGMENT IDENTIFICATION');

    const business = await this.getBusinessByProjectId(projectId);
    if (!business || !business.selectedTargetMarketId) {
      console.log(
        chalk.red('Business not found or no target market selected.'),
      );
      return;
    }

    const targetMarket = await this.targetMarketRepository.findOne({
      where: { id: business.selectedTargetMarketId },
    });

    if (!targetMarket) {
      console.log(
        chalk.red(
          `Target market with ID ${business.selectedTargetMarketId} not found.`,
        ),
      );
      return;
    }

    const existingSegments = await this.marketSegmentRepository.find({
      where: { targetMarketId: targetMarket.id },
    });

    if (existingSegments.length === 0) {
      const spinner = this.createSpinner(
        `Identifying market segments within: ${targetMarket.name}`,
      ).start();

      const targetMarketPromptContent = `
      Target Market Name: ${targetMarket.name}\n
      Target Market Description: ${targetMarket.description}\n
      `;

      spinner.text = 'Analyzing market segments via Perplexity AI...';

      const response = await this.perplexityAssistantService.askPerplexity(
        [
          {
            role: 'system',
            content: MarketSegmentIdentificationPrompt,
          },
          {
            role: 'user',
            content: targetMarketPromptContent,
          },
        ],
        'sonar-pro',
        6000,
      );

      spinner.text = 'Processing segment data...';

      const content = response.content;
      const parsedData = await this.openaiAssistantService.formatToJson(
        content,
        MarketSegmentIdentificationSchema,
      );

      for (const segment of parsedData.marketSegments) {
        const marketSegment = new MarketSegment();
        marketSegment.title = segment.title;
        marketSegment.segmentSize = segment.segmentSize;
        marketSegment.description = segment.description;
        marketSegment.targetMarketId = targetMarket.id;
        marketSegment.questionAnswers = segment.questionAnswers.map(
          (qa: any) => ({
            score: qa.score,
          }),
        );
        await this.marketSegmentRepository.save(marketSegment);
      }

      spinner.stop();
      this.printSuccess(
        `Identified ${parsedData.marketSegments.length} market segments`,
      );
    } else {
      console.log(
        chalk.yellow(
          `✅ Market segments already identified for: ${targetMarket.name}`,
        ),
      );
      console.log();
    }

    await this.selectMarketSegmentOfInterest(projectId);
  }

  async selectMarketSegmentOfInterest(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('MARKET SEGMENT SELECTION');

    const business = await this.getBusinessByProjectId(projectId);
    if (!business || !business.selectedTargetMarketId) {
      console.log(
        chalk.red('Business not found or no target market selected.'),
      );
      return;
    }

    const targetMarket = await this.targetMarketRepository.findOne({
      where: { id: business.selectedTargetMarketId },
    });

    if (!targetMarket) {
      console.log(
        chalk.red(
          `Target market with ID ${business.selectedTargetMarketId} not found.`,
        ),
      );
      return;
    }

    const marketSegments = await this.marketSegmentRepository.find({
      where: { targetMarketId: targetMarket.id },
    });

    if (marketSegments.length === 0) {
      console.log(
        chalk.red(
          'No market segments identified for the selected target market.',
        ),
      );
      return;
    }

    this.printSubHeader(`Market Segments within: ${targetMarket.name}`);

    marketSegments.forEach((segment, index) => {
      const isSelected = targetMarket.selectedMarketSegmentId === segment.id;
      this.printSegmentCardWithSelection(segment, index, isSelected);
    });

    if (targetMarket.selectedMarketSegmentId) {
      const selectedSegment = marketSegments.find(
        (s) => s.id === targetMarket.selectedMarketSegmentId,
      );
      if (selectedSegment) {
        console.log(
          chalk.green.bold(`Current Selection: ${selectedSegment.title}`),
        );
        console.log();

        const changeSelection = await inquirer.prompt<{ change: boolean }>([
          {
            type: 'confirm',
            name: 'change',
            message: 'Do you want to change your market segment selection?',
            default: false,
          },
        ]);

        if (!changeSelection.change) {
          this.clearScreen();
          this.printHeader('MARKET SEGMENT CONFIRMED');
          this.printSegmentCardWithSelection(selectedSegment, 0, true);
          this.printSuccess('Market segment selection confirmed');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return;
        }
      }
    }

    const answers = await inquirer.prompt<{
      segmentOfInterest: string;
    }>([
      {
        type: 'list',
        name: 'segmentOfInterest',
        message: 'Select your target market segment:',
        choices: marketSegments.map((segment) => {
          const totalQuestions = segment.questionAnswers.length;
          const sumOfScores = segment.questionAnswers.reduce(
            (acc, qa) => acc + (qa.score || 0),
            0,
          );
          const scorePercent = Math.round(
            (sumOfScores / (totalQuestions * 5)) * 100,
          );

          const isCurrentlySelected =
            targetMarket.selectedMarketSegmentId === segment.id;
          const selectionIndicator = isCurrentlySelected ? ' [CURRENT]' : '';

          return {
            name: `${segment.title} (${scorePercent}% fit score, ${segment.segmentSize})${selectionIndicator}`,
            value: segment.id,
          };
        }),
      },
    ]);

    const selectedSegmentId = answers.segmentOfInterest;
    targetMarket.selectedMarketSegmentId = selectedSegmentId;
    await this.targetMarketRepository.save(targetMarket);

    this.clearScreen();
    this.printHeader('SEGMENT SELECTION CONFIRMED');

    const selectedSegment = marketSegments.find(
      (s) => s.id === selectedSegmentId,
    );
    this.printSegmentCardWithSelection(selectedSegment!, 0, true);

    this.printSuccess(
      'Market segment has been locked in for persona generation',
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private printSegmentCardWithSelection(
    segment: MarketSegment,
    index: number,
    isSelected: boolean = false,
  ): void {
    const totalQuestions = segment.questionAnswers.length;
    const sumOfScores = segment.questionAnswers.reduce(
      (acc, qa) => acc + (qa.score || 0),
      0,
    );
    const productFitScore = `${sumOfScores}/${totalQuestions * 5}`;
    const scorePercent = Math.round((sumOfScores / (totalQuestions * 5)) * 100);

    const selectionIcon = isSelected ? '✅' : '⚪';
    const titleColor = isSelected ? chalk.green.bold : chalk.white.bold;

    console.log(chalk.blue(`┌─ Segment ${index + 1} ${selectionIcon}`));
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + titleColor(segment.title));
    console.log(chalk.blue(`│ `) + chalk.gray(segment.description));
    console.log(
      chalk.blue(`│ `) + chalk.yellow(`Size: ${segment.segmentSize}`),
    );
    console.log(
      chalk.blue(`│ `) +
        chalk.green(`Fit Score: ${productFitScore} (${scorePercent}%)`),
    );
    if (isSelected) {
      console.log(chalk.blue(`│ `) + chalk.green.bold(`🎯 SELECTED SEGMENT`));
    }
    console.log(chalk.blue(`└─`));
    console.log();
  }

  private printMarketAnalysisCard(market: TargetMarket, index: number): void {
    console.log(chalk.blue(`┌─ Market ${index + 1} ✅ ANALYZED`));
    console.log(chalk.blue(`│`));
    console.log(chalk.blue(`│ `) + chalk.white.bold(market.name));
    console.log(chalk.blue(`│ `) + chalk.gray(market.description));
    console.log(chalk.blue(`│`));

    if (market.marketSize) {
      console.log(
        chalk.blue(`│ `) +
          chalk.green(
            `💰 Market Size: ${market.marketSize.value} ${market.marketSize.currency} (${market.marketSize.unit})`,
          ),
      );
    }

    if (market.cagr) {
      console.log(
        chalk.blue(`│ `) +
          chalk.green(
            `📈 CAGR: ${market.cagr.ratePercent}% (${market.cagr.period.startYear}-${market.cagr.period.endYear})`,
          ),
      );
    }

    if (market.saturation) {
      console.log(
        chalk.blue(`│ `) + chalk.yellow(`🎯 Stage: ${market.saturation.stage}`),
      );
      console.log(
        chalk.blue(`│ `) +
          chalk.yellow(`🏁 Competition: ${market.saturation.competitionLevel}`),
      );
      console.log(
        chalk.blue(`│ `) +
          chalk.yellow(`💡 Opportunity: ${market.saturation.opportunityLevel}`),
      );
    }

    if (market.keyHighlights && market.keyHighlights.length > 0) {
      console.log(chalk.blue(`│`));
      console.log(chalk.blue(`│ `) + chalk.cyan(`✨ Key Highlights:`));
      market.keyHighlights.slice(0, 2).forEach((highlight) => {
        console.log(chalk.blue(`│   `) + chalk.gray(`• ${highlight}`));
      });
    }

    if (market.opportunities && market.opportunities.length > 0) {
      console.log(chalk.blue(`│`));
      console.log(chalk.blue(`│ `) + chalk.green(`🚀 Top Opportunities:`));
      market.opportunities.slice(0, 2).forEach((opportunity) => {
        console.log(chalk.blue(`│   `) + chalk.gray(`• ${opportunity}`));
      });
    }

    if (market.challenges && market.challenges.length > 0) {
      console.log(chalk.blue(`│`));
      console.log(chalk.blue(`│ `) + chalk.red(`⚠️  Key Challenges:`));
      market.challenges.slice(0, 2).forEach((challenge) => {
        console.log(chalk.blue(`│   `) + chalk.gray(`• ${challenge}`));
      });
    }

    console.log(chalk.blue(`└─`));
    console.log();
  }

  async generateCustomerPersona(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('CUSTOMER PERSONA GENERATION');

    const business = await this.businessRepository.findOne({
      where: { id: projectId },
    });

    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    if (business.businessPersona) {
      console.log(
        chalk.yellow(
          '✅ Customer persona already generated. Displaying existing persona...',
        ),
      );

      this.clearScreen();
      this.printHeader('EXISTING CUSTOMER PERSONA');
      this.printPersonaCard(business.businessPersona);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return;
    }

    const spinner = this.createSpinner(
      'Creating detailed customer persona based on market analysis...',
    ).start();

    const selectedTargetMarket = await this.targetMarketRepository.findOne({
      where: { id: business.selectedTargetMarketId },
    });

    if (!selectedTargetMarket) {
      console.log(chalk.red(`Selected target market not found.`));
      return;
    }

    const selectedMarketSegment = await this.marketSegmentRepository.findOne({
      where: { id: selectedTargetMarket.selectedMarketSegmentId },
    });

    if (!selectedMarketSegment) {
      console.log(chalk.red(`Selected market segment not found.`));
      return;
    }

    spinner.text = 'Gathering project context...';

    const projectPromptContent =
      await this.projectService.getProjectPromptContent(projectId);

    const customerPersonaPrompt = `
    ${projectPromptContent}\n
    Target Market Name: ${selectedTargetMarket.name}\n
    Target Market Description: ${selectedTargetMarket.description}\n
    Market Segment Title: ${selectedMarketSegment.title}\n
    Market Segment Description: ${selectedMarketSegment.description}\n
    `;

    spinner.text = 'Generating persona with GPT-4 Mini...';

    const response = await this.openaiAssistantService.chatCompletion(
      'gpt-4o-mini',
      [
        {
          role: 'system',
          content: CustomerPersonaGenerationPrompt,
        },
        {
          role: 'user',
          content: customerPersonaPrompt,
        },
      ],
      CustomerPersonaGenerationSchema,
    );

    const personaData = JSON.parse(response);

    spinner.text = 'Saving persona to database...';

    const businessPersona = new BusinessPersona();
    businessPersona.id = business.id;
    businessPersona.name = personaData.name;
    businessPersona.occupation = personaData.occupation;
    businessPersona.gender = personaData.gender;
    businessPersona.maritalStatus = personaData.maritalStatus;
    businessPersona.keyTraits = personaData.keyTraits;
    businessPersona.personalityType = personaData.personalityType;
    businessPersona.purchaseDrivers = personaData.purchaseDrivers;
    businessPersona.preferredBrands = personaData.preferredBrands;
    businessPersona.biography = personaData.biography;
    businessPersona.painPoints = personaData.painPoints;
    businessPersona.purchaseFrequency = personaData.purchaseFrequency;
    businessPersona.communityTouchpoints = personaData.communityTouchpoints;
    businessPersona.businessId = business.id;
    businessPersona.business = business;

    await this.businessPersonaRepository.save(businessPersona);

    business.businessPersona = businessPersona;
    await this.businessRepository.save(business);

    spinner.stop();

    this.clearScreen();
    this.printHeader('CUSTOMER PERSONA GENERATED');

    this.printPersonaCard(businessPersona);

    this.printSuccess(
      'Customer persona has been successfully created and saved',
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async customerCRM(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('CUSTOMER CRM & RESEARCH');

    const business = await this.businessRepository.findOne({
      where: { id: projectId },
      relations: ['project', 'businessPersona'],
    });

    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    const spinner = this.createSpinner(
      'Generating CRM filters and conducting customer research...',
    ).start();

    const crmPrompt = `
    Project and Product details:
          Project Title : ${business.project.title}\n
          Project Methodology : ${business.project.methodology}\n
          Project Planetary Impact : ${business.project.impact}\n
          Business Persona Name : ${business.businessPersona.name}\n
          Business Persona Occupation : ${business.businessPersona.occupation}\n
          Business Persona Gender : ${business.businessPersona.gender}\n
          Business Persona Marital Status : ${business.businessPersona.maritalStatus}\n
          Business Persona Key Traits : ${business.businessPersona.keyTraits.join(', ')}\n
          Business Persona Personality Type : ${business.businessPersona.personalityType}\n
          Business Persona Purchase Drivers : ${business.businessPersona.purchaseDrivers.join(', ')}\n
          Business Persona Preferred Brands : ${business.businessPersona.preferredBrands.join(', ')}\n
          Business Persona Biography : ${business.businessPersona.biography}\n
          Business Persona Pain Points : ${business.businessPersona.painPoints.join(', ')}\n
          Business Persona Community Touchpoints : ${business.businessPersona.communityTouchpoints.join(', ')}\n
          Business Persona Purchase Frequency : ${business.businessPersona.purchaseFrequency.interval} ${business.businessPersona.purchaseFrequency.period}\n
    `;

    spinner.text = 'Generating CRM filters...';

    const crmFilterResponse = await this.openaiAssistantService.chatCompletion(
      'gpt-4o-mini',
      [
        {
          role: 'system',
          content: CRMFilterGenerationPrompt,
        },
        {
          role: 'user',
          content: crmPrompt,
        },
      ],
      CRMFilterGenerationSchema,
    );

    const crmFilterData = JSON.parse(crmFilterResponse);
    business.customerCRMFilter = crmFilterData.customerResearchFilters;
    business.competitorCRMFilter = crmFilterData.competitorResearchFilters;
    await this.businessRepository.save(business);

    // DISPLAY CRM FILTERS
    this.clearScreen();
    this.printHeader('CRM FILTERS GENERATED');

    console.log(chalk.cyan.bold('CRM Filters:'));
    if (Array.isArray(business.customerCRMFilter)) {
      const table = new Table({
        head: [
          chalk.white.bold('Filter Name'),
          chalk.white.bold('Filter Type'),
        ],
        style: {
          head: [],
          border: ['cyan'],
        },
      });

      business.customerCRMFilter.forEach((filter: CRMFilter) => {
        table.push([filter.name, chalk.yellow(filter.type)]);
      });

      console.log(table.toString());
    }

    spinner.text = 'Conducting customer research...';

    const customerResearchResponse =
      await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: CutomerResearchGenerationPrompt,
          },
          {
            role: 'user',
            content: crmPrompt,
          },
        ],
        CRMResearchGenerationSchema,
      );

    const customerResearchData = JSON.parse(customerResearchResponse);
    business.customerResearchResults =
      customerResearchData.customerResearchResults;

    await this.businessRepository.save(business);

    spinner.stop();

    this.clearScreen();
    this.printHeader('CUSTOMER RESEARCH RESULTS');

    if (
      business.customerResearchResults &&
      business.customerResearchResults.length > 0
    ) {
      const table = new Table({
        head: [
          chalk.white.bold('Company Name'),
          chalk.white.bold('Company Size'),
          chalk.white.bold('Contact Details'),
          chalk.white.bold('Investment Series'),
          chalk.white.bold('Location'),
        ],
        style: {
          head: [],
          border: ['cyan'],
        },
      });

      business.customerResearchResults.forEach((result) => {
        table.push([
          result.companyName,
          result.companySize,
          result.contactDetails || 'N/A',
          result.investmentSeries || 'N/A',
          result.location || 'N/A',
        ]);
      });

      console.log(table.toString());
      console.log();
    }

    this.printSuccess(
      'Customer CRM filters and research completed successfully',
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async businessModelCanvas(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('BUSINESS MODEL CANVAS');

    const business = await this.businessRepository.findOne({
      where: { id: projectId },
      relations: ['project', 'businessPersona'],
    });

    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    if (
      business.businessModelCanvas &&
      business.businessModelCanvas.length > 0
    ) {
      console.log(
        chalk.yellow(
          '✅ Business model canvas already generated. Displaying existing models...',
        ),
      );

      this.clearScreen();
      this.printHeader('EXISTING BUSINESS MODEL CANVAS');

      business.businessModelCanvas.forEach((model, index) => {
        this.printBusinessModelCard(model, index);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));
      return;
    }

    const spinner = this.createSpinner(
      'Generating comprehensive business model canvas...',
    ).start();

    const crmPrompt = `
    Project and Product details:
          Project Title : ${business.project.title}\n
          Project Methodology : ${business.project.methodology}\n
          Project Planetary Impact : ${business.project.impact}\n
          Business Persona Name : ${business.businessPersona.name}\n
          Business Persona Occupation : ${business.businessPersona.occupation}\n
          Business Persona Gender : ${business.businessPersona.gender}\n
          Business Persona Marital Status : ${business.businessPersona.maritalStatus}\n
          Business Persona Key Traits : ${business.businessPersona.keyTraits.join(', ')}\n
          Business Persona Personality Type : ${business.businessPersona.personalityType}\n
          Business Persona Purchase Drivers : ${business.businessPersona.purchaseDrivers.join(', ')}\n
          Business Persona Preferred Brands : ${business.businessPersona.preferredBrands.join(', ')}\n
          Business Persona Biography : ${business.businessPersona.biography}\n
          Business Persona Pain Points : ${business.businessPersona.painPoints.join(', ')}\n
          Business Persona Community Touchpoints : ${business.businessPersona.communityTouchpoints.join(', ')}\n
          Business Persona Purchase Frequency : ${business.businessPersona.purchaseFrequency.interval} ${business.businessPersona.purchaseFrequency.period}\n
    `;

    spinner.text = 'Processing business model with GPT-4 Mini...';

    const businessModelResponse =
      await this.openaiAssistantService.chatCompletion(
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content: BusinessModelGenerationPrompt,
          },
          {
            role: 'user',
            content: crmPrompt,
          },
        ],
        BusinessModelCanvasSchema,
      );

    const businessModelData = JSON.parse(businessModelResponse).businessModels;
    business.businessModelCanvas = businessModelData;

    spinner.text = 'Saving business models to database...';
    await this.businessRepository.save(business);

    spinner.stop();

    this.clearScreen();
    this.printHeader('BUSINESS MODEL CANVAS GENERATED');

    if (
      !business.businessModelCanvas ||
      !Array.isArray(business.businessModelCanvas)
    ) {
      console.log(chalk.yellow('No business model canvas data available.'));
    } else {
      business.businessModelCanvas.forEach((model, index) => {
        this.printBusinessModelCard(model, index);
      });

      console.log(
        chalk.green.bold(
          `Total Business Models Generated: ${business.businessModelCanvas.length}`,
        ),
      );
    }

    this.printSuccess('Business model canvas has been generated successfully');

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async pricingStrategy(projectId: string): Promise<void> {
    this.clearScreen();
    this.printHeader('PRICING STRATEGY');

    const business = await this.businessRepository.findOne({
      where: { id: projectId },
      relations: ['project', 'businessPersona'],
    });

    if (!business) {
      console.log(chalk.red('Business not found for the given project ID.'));
      return;
    }

    if (
      business.costBasedPricingModel &&
      business.costBasedPricingModel.length > 0
    ) {
      console.log(
        chalk.yellow(
          '✅ Pricing strategy already generated. Displaying existing models...',
        ),
      );

      this.clearScreen();
      this.printHeader('EXISTING PRICING STRATEGY');

      business.costBasedPricingModel.forEach((model, index) => {
        this.printPricingCard(model, index);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));
      return;
    }

    const spinner = this.createSpinner(
      'Developing comprehensive pricing strategy...',
    ).start();

    const pricingPrompt = `
    Project and Product details:
          Project Title : ${business.project.title}\n
          Project Methodology : ${business.project.methodology}\n
          Project Planetary Impact : ${business.project.impact}\n
          Business Persona Name : ${business.businessPersona.name}\n
          Business Persona Occupation : ${business.businessPersona.occupation}\n
          Business Persona Gender : ${business.businessPersona.gender}\n
          Business Persona Marital Status : ${business.businessPersona.maritalStatus}\n
          Business Persona Key Traits : ${business.businessPersona.keyTraits.join(', ')}\n
          Business Persona Personality Type : ${business.businessPersona.personalityType}\n
          Business Persona Purchase Drivers : ${business.businessPersona.purchaseDrivers.join(', ')}\n
          Business Persona Preferred Brands : ${business.businessPersona.preferredBrands.join(', ')}\n
          Business Persona Biography : ${business.businessPersona.biography}\n
          Business Persona Pain Points : ${business.businessPersona.painPoints.join(', ')}\n
          Business Persona Community Touchpoints : ${business.businessPersona.communityTouchpoints.join(', ')}\n
          Business Persona Purchase Frequency : ${business.businessPersona.purchaseFrequency.interval} ${business.businessPersona.purchaseFrequency.period}\n
    `;

    spinner.text = 'Calculating pricing models with GPT-4 Mini...';

    const pricingResponse = await this.openaiAssistantService.chatCompletion(
      'gpt-4o-mini',
      [
        {
          role: 'system',
          content: CostBasedPricingModelGenerationPrompt,
        },
        {
          role: 'user',
          content: pricingPrompt,
        },
      ],
      CostBasedPricingModelSchema,
    );

    const pricingData = JSON.parse(pricingResponse);
    business.competitivePricingModel = pricingData.competitivePricingModel;
    business.costBasedPricingModel = pricingData.costBasedPricingModel;

    spinner.text = 'Saving pricing strategy to database...';
    await this.businessRepository.save(business);

    spinner.stop();

    this.clearScreen();
    this.printHeader('PRICING STRATEGY GENERATED');

    if (
      business.costBasedPricingModel &&
      business.costBasedPricingModel.length > 0
    ) {
      business.costBasedPricingModel.forEach((model, index) => {
        this.printPricingCard(model, index);
      });

      console.log(
        chalk.green.bold(
          `Total Pricing Models Generated: ${business.costBasedPricingModel.length}`,
        ),
      );
    }

    this.printSuccess('Pricing strategy has been developed successfully');

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
