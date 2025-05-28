import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { Copilot, AnalysisType, PipelineState } from '../schema/copilot.schema';
import { CopilotQuestions } from '../common/copilotQuestions';
import { technologyReadinessLevelMarks } from '../common/trlMarks';
import { OpenaiAssistantService } from 'src/assistant/service/openai.assistant.service';

@Injectable()
export class CopilotService {
  constructor(
    @InjectRepository(Copilot)
    private copilotRepository: Repository<Copilot>,
    private openaiAssistantService: OpenaiAssistantService,
  ) {}

  async findCopilotByProjectId(projectId: string): Promise<Copilot> {
    let copilot = await this.copilotRepository.findOne({
      where: { id: projectId },
    });
    if (!copilot) {
      copilot = new Copilot();
      copilot.id = projectId;
      copilot.analysis = {
        analysisType: AnalysisType.DESIGN,
        pipelineState: PipelineState.IDLE,
        steps: {},
        queries: {},
        outcomes: {},
        finalReportURL: '',
        actionableWorkPackages: [],
      };
      await this.copilotRepository.save(copilot);
    }
    return copilot;
  }

  async showCopilot(projectId: string): Promise<void> {
    console.log(chalk.blue('Copilot Console'));
    console.log(chalk.blue('==================='));

    const copilot = await this.findCopilotByProjectId(projectId);

    const primaryGoalAnswers = copilot.primaryGoalAnswers || {};
    let primaryGoalSummary = copilot?.primaryGoalSummary;
    let statusSummary = copilot?.statusSummary;
    const statusAnswers = copilot.statusAnswers || {};
    const criticalSubGoals = copilot.criticalSubGoals || {};
    const mustHaveFeatures = copilot.mustHaveFeatures || {};
    const niceToHaveFeatures = copilot.niceToHaveFeatures || {};
    const constraints = copilot.constraints || {};

    for (const key in CopilotQuestions) {
      const question = CopilotQuestions[key as keyof typeof CopilotQuestions];
      console.log(chalk.blue(question.title));
      console.log(chalk.gray(question.description));

      const questionsToAsk = question.questions || [];

      switch (key) {
        case 'primaryGoal': {
          for (const q of questionsToAsk) {
            const answer = primaryGoalAnswers[q.question];
            if (answer) {
              console.log(chalk.green(q.question));
              console.log(chalk.gray(answer));
            } else {
              console.log(chalk.red(q.question));
              await inquirer
                .prompt<{ answer: string }>([
                  {
                    type: 'input',
                    name: 'answer',
                    message: q.description,
                  },
                ])
                .then((answers) => {
                  const newAnswer = answers.answer;
                  primaryGoalAnswers[q.question] = newAnswer;
                });
            }
          }

          if (!primaryGoalSummary) {
            primaryGoalSummary =
              await this.openaiAssistantService.generateSummary(
                JSON.stringify(primaryGoalAnswers),
                500,
              );
          }

          console.log(chalk.blue('Primary Goal Summary:'));
          console.log(chalk.gray(primaryGoalSummary));
          break;
        }
        case 'status': {
          for (const q of questionsToAsk) {
            const answer = statusAnswers[q.question];
            if (answer) {
              console.log(chalk.green(q.question));
              console.log(chalk.gray(answer));
            } else {
              console.log(chalk.red(q.question));

              if (q.question.includes('Technology Readiness Level (TRL)')) {
                // Show checkbox list for selecting TRL level
                const trlAnswer = await inquirer.prompt<{ trl: string }>([
                  {
                    type: 'list',
                    name: 'trl',
                    message: 'Select the Technology Readiness Level (TRL):',
                    choices: technologyReadinessLevelMarks.map((trl) => ({
                      name: `TRL ${trl.label} - ${trl.description}`,
                      value: trl.value.toString(),
                    })),
                  },
                ]);

                statusAnswers[q.question] = trlAnswer.trl;
                continue; // Skip the default prompt for this question
              }
              await inquirer
                .prompt<{ answer: string }>([
                  {
                    type: 'input',
                    name: 'answer',
                    message: q.description,
                  },
                ])
                .then((answers) => {
                  const newAnswer = answers.answer;
                  statusAnswers[q.question] = newAnswer;
                });
            }
          }

          if (!statusSummary) {
            statusSummary = await this.openaiAssistantService.generateSummary(
              JSON.stringify(statusAnswers),
              500,
            );
          }

          copilot.statusSummary = statusSummary;
          console.log(chalk.blue('Status Summary:'));
          console.log(chalk.gray(statusSummary));
          break;
        }
        case 'criticalSubGoals': {
          if (criticalSubGoals && Object.keys(criticalSubGoals).length > 0) {
            break;
          }

          console.log(
            chalk.yellow(
              'Please enter your critical sub-goals one by one. Press enter with empty input when done.',
            ),
          );
          const subGoals: string[] = [];

          let continueAdding = true;
          let counter = 1;

          while (continueAdding) {
            await inquirer
              .prompt<{ answer: string }>([
                {
                  type: 'input',
                  name: 'answer',
                  message: `Critical Sub-Goal #${counter} (leave empty to finish):`,
                },
              ])
              .then((answers) => {
                if (answers.answer.trim() === '') {
                  continueAdding = false;
                } else {
                  subGoals.push(answers.answer);
                  counter++;
                }
              });
          }

          if (subGoals.length > 0) {
            subGoals.forEach((goal, index) => {
              criticalSubGoals[`SubGoal ${index + 1}`] = goal;
            });
            console.log(
              chalk.green(`Added ${subGoals.length} critical sub-goals.`),
            );
          } else {
            console.log(chalk.yellow('No critical sub-goals were added.'));
          }
          break;
        }
        case 'mustHaveFeatures': {
          if (mustHaveFeatures && Object.keys(mustHaveFeatures).length > 0) {
            break;
          }

          console.log(
            chalk.yellow(
              'Please enter your must-have features one by one. Press enter with empty input when done.',
            ),
          );
          const features: string[] = [];

          let continueAdding = true;
          let counter = 1;

          while (continueAdding) {
            await inquirer
              .prompt<{ answer: string }>([
                {
                  type: 'input',
                  name: 'answer',
                  message: `Must-Have Feature #${counter} (leave empty to finish):`,
                },
              ])
              .then((answers) => {
                if (answers.answer.trim() === '') {
                  continueAdding = false;
                } else {
                  features.push(answers.answer);
                  counter++;
                }
              });
          }

          if (features.length > 0) {
            features.forEach((feature, index) => {
              mustHaveFeatures[`Feature ${index + 1}`] = feature;
            });
            console.log(
              chalk.green(`Added ${features.length} must-have features.`),
            );
          } else {
            console.log(chalk.yellow('No must-have features were added.'));
          }
          break;
        }
        case 'niceToHaveFeatures': {
          if (
            niceToHaveFeatures &&
            Object.keys(niceToHaveFeatures).length > 0
          ) {
            break;
          }

          console.log(
            chalk.yellow(
              'Please enter your nice-to-have features one by one. Press enter with empty input when done.',
            ),
          );
          const features: string[] = [];

          let continueAdding = true;
          let counter = 1;

          while (continueAdding) {
            await inquirer
              .prompt<{ answer: string }>([
                {
                  type: 'input',
                  name: 'answer',
                  message: `Nice-to-Have Feature #${counter} (leave empty to finish):`,
                },
              ])
              .then((answers) => {
                if (answers.answer.trim() === '') {
                  continueAdding = false;
                } else {
                  features.push(answers.answer);
                  counter++;
                }
              });
          }

          if (features.length > 0) {
            features.forEach((feature, index) => {
              niceToHaveFeatures[`Feature ${index + 1}`] = feature;
            });
            console.log(
              chalk.green(`Added ${features.length} nice-to-have features.`),
            );
          } else {
            console.log(chalk.yellow('No nice-to-have features were added.'));
          }
          break;
        }
        case 'constraints': {
          if (constraints && Object.keys(constraints).length > 0) {
            break;
          }

          console.log(
            chalk.yellow(
              'Please enter your constraints one by one. Press enter with empty input when done.',
            ),
          );
          const constraintsList: string[] = [];

          let continueAdding = true;
          let counter = 1;

          while (continueAdding) {
            await inquirer
              .prompt<{ answer: string }>([
                {
                  type: 'input',
                  name: 'answer',
                  message: `Constraint #${counter} (leave empty to finish):`,
                },
              ])
              .then((answers) => {
                if (answers.answer.trim() === '') {
                  continueAdding = false;
                } else {
                  constraintsList.push(answers.answer);
                  counter++;
                }
              });
          }

          if (constraintsList.length > 0) {
            constraintsList.forEach((constraint, index) => {
              constraints[`Constraint ${index + 1}`] = constraint;
            });
            console.log(
              chalk.green(`Added ${constraintsList.length} constraints.`),
            );
          } else {
            console.log(chalk.yellow('No constraints were added.'));
          }
          break;
        }
        default:
          console.log(chalk.red('No answers found for this question.'));
      }
    }

    // Save the copilot data back to the database
    copilot.primaryGoalAnswers = primaryGoalAnswers;
    copilot.primaryGoalSummary = primaryGoalSummary;
    copilot.statusSummary = statusSummary;
    copilot.statusAnswers = statusAnswers;
    copilot.criticalSubGoals = criticalSubGoals;
    copilot.mustHaveFeatures = mustHaveFeatures;
    copilot.niceToHaveFeatures = niceToHaveFeatures;
    copilot.constraints = constraints;
    await this.copilotRepository.save(copilot);
    console.log(chalk.green('Copilot data saved successfully!'));
    console.log(chalk.blue('==================='));
    console.log(chalk.blue('End of Copilot Console'));
  }

  async getCopilotPromptContent(projectId: string): Promise<string> {
    const copilot = await this.findCopilotByProjectId(projectId);
    const primaryGoal = Object.entries(copilot.primaryGoalAnswers)
      .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
      .join('\n\n');

    const criticalSubGoals = Object.entries(copilot.criticalSubGoals)
      .map(([priority, answer]) => `Priority ${priority}: ${answer}`)
      .join('\n');

    const mustHaveFeatures = Object.entries(copilot.mustHaveFeatures)
      .map(([priority, answer]) => `Priority: ${priority}: ${answer}`)
      .join('\n');

    const niceToHaveFeatures = Object.entries(copilot.niceToHaveFeatures)
      .map(([priority, answer]) => `Priority: ${priority}: ${answer}`)
      .join('\n');

    const constraints = Object.entries(copilot.constraints)
      .map(([priority, answer]) => `Priority: ${priority}: ${answer}`)
      .join('\n');

    const copilotContent = `
    These are the following information user shared with us.
  
    # Primary Goal
    ${primaryGoal}
  
    # Critical Sub Goals
    ${criticalSubGoals}
  
    # Must Have Features
    ${mustHaveFeatures}
  
    # Nice to Have Features
    ${niceToHaveFeatures}
  
    # Constraints
    ${constraints}
    `;
    return copilotContent;
  }
}
