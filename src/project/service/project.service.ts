import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../schema/project.schema';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import type { ProjectCreationDTO, ProjectSelectionDTO } from '../dto/input.dto';
import type { SelectedProjectDTO } from '../dto/output.dot';
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async createProject(): Promise<string> {
    await inquirer
      .prompt<ProjectCreationDTO>([
        {
          type: 'input',
          name: 'title',
          message: "What's your project title?",
        },
        {
          type: 'input',
          name: 'summary',
          message: "What's your project summary?",
        },
        {
          type: 'input',
          name: 'methodology',
          message: "What's your project methodology?",
        },
        {
          type: 'input',
          name: 'environmentalImpact',
          message: "What's your project's environmental impact?",
        },
      ])
      .then(async (answers: ProjectCreationDTO) => {
        const project = new Project();
        project.title = answers.title;
        project.summary = answers.summary;
        project.methodology = answers.methodology;
        project.impact = answers.environmentalImpact;

        const spinner = ora('Creating project...').start();
        try {
          await this.projectRepository.save(project);
          spinner.succeed(chalk.green('Project created successfully!'));
        } catch (error) {
          spinner.fail(chalk.red('Failed to create project.'));
          console.error(chalk.red(error));
        } finally {
          spinner.stop();
        }
        console.log(chalk.blue('Project details:'));
        console.log(chalk.blue(`Project ID: ${project.id}`));
        console.log(`Project created successfully!`);
        return project.id;
      })
      .catch((error) => {
        console.error(chalk.red('Error creating project:', error));
        throw error;
      });
    return '';
  }

  async projectSelector() {
    const spinner = ora('Loading projects...').start();
    const projects = await this.projectRepository.find();
    spinner.succeed(chalk.green(`Found ${projects.length} projects`));
    spinner.stop();

    if (projects.length > 0) {
      const choices: ProjectSelectionDTO[] = [
        ...projects.map(
          (project): ProjectSelectionDTO => ({
            name: `${project.id} - ${project.title}`,
            value: project.id,
          }),
        ),
        { name: 'Create new project', value: 'CREATE_NEW' },
      ];

      const projectAnswer = await inquirer.prompt<SelectedProjectDTO>([
        {
          type: 'list',
          choices,
          name: 'projectId',
          message: 'Select a project:',
        },
      ]);

      if (projectAnswer.projectId === 'CREATE_NEW') {
        return await this.createProject();
      }

      return projectAnswer.projectId;
    } else {
      console.log(chalk.yellow('No projects found. Create a new project.'));
      return await this.createProject();
    }
  }

  async getProjectPromptContent(projectId: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    return `
    Project Details:
    - **Title**: ${project?.title}
    - **Summary**: ${project?.summary}
    - **Methodology**: ${project?.methodology}
    - **Environmental Impact**: ${project?.impact}
    `;
  }
}
