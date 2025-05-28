import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../project/schema/project.schema';

// Enums from CopilotAnalysis
export enum AnalysisType {
  DESIGN = 'design',
  VALIDATE = 'validate',
  OPTIMIZE = 'optimize',
  COMPARE = 'compare',
}

export enum PipelineState {
  IDLE = 'idle',
  RUNNING = 'running',
  DONE = 'done',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  PAUSED = 'paused',
  WAITING = 'waiting',
}

export enum AnalysisQueryState {
  DONE = 'done',
  GENERATING = 'generating',
  WAITING = 'waiting',
  FAILED = 'failed',
}

// Interfaces for Copilot
export interface IONodeData {
  title: string;
  description: string;
  nodeType: string[];
  isMain: boolean;
}

export interface ProcessNodeData {
  title: string;
  description: string;
  inputs: {
    name: string;
    isMain: boolean;
  }[];
  outputs: {
    name: string;
    isMain: boolean;
  }[];
}

export interface IONode {
  id: string;
  type: 'io';
  data: IONodeData;
  position: {
    x: number;
    y: number;
  };
}

export interface ProcessNode {
  id: string;
  type: 'process';
  data: ProcessNodeData;
  position: {
    x: number;
    y: number;
  };
}

export type DiagramNode = IONode | ProcessNode;

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  markerEnd?: {
    type: string;
  };
  label?: string;
  style?: {
    strokeWidth?: number;
  };
  labelStyle?: {
    fontSize?: number;
  };
}

export interface PhloDiagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface CopilotAnswer {
  [key: string]: string;
}

// Interfaces from CopilotAnalysis
export interface AnalysisSteps {
  [key: string]: {
    step: string;
    description: string;
  };
}

export interface AnalysisQuery {
  [key: string]: {
    groupIndex: number;
    content?: string;
    query: string;
    state?: AnalysisQueryState;
    reportURL?: string;
    citation?: {
      title: string;
      url: string;
    }[];
  };
}

export interface ActionableWorkPackage {
  priorityIndex: number;
  title: string;
  description: string;
  duration: number;
  tasks: string[];
  created: boolean;
}

export interface AnalysisOutcome {
  [key: string]: string[];
}

// Embedded Analysis data structure
export interface Analysis {
  analysisType: AnalysisType;
  pipelineState: PipelineState;
  steps: AnalysisSteps;
  queries: AnalysisQuery;
  outcomes: AnalysisOutcome;
  finalReportURL: string;
  actionableWorkPackages: ActionableWorkPackage[];
}

@Entity()
export class Copilot {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @OneToOne(() => Project, (project) => project.copilot)
  @JoinColumn({ name: 'id' })
  project: Project;

  // Original Copilot fields
  @Column('jsonb', { nullable: true })
  primaryGoalAnswers: CopilotAnswer;

  @Column('jsonb', { nullable: true })
  statusAnswers: CopilotAnswer;

  @Column('text', { nullable: true })
  primaryGoalSummary: string;

  @Column('text', { nullable: true })
  statusSummary: string;

  @Column('jsonb', { nullable: true })
  criticalSubGoals: CopilotAnswer;

  @Column('jsonb', { nullable: true })
  mustHaveFeatures: CopilotAnswer;

  @Column('jsonb', { nullable: true })
  niceToHaveFeatures: CopilotAnswer;

  @Column('jsonb', { nullable: true })
  constraints: CopilotAnswer;

  @Column('jsonb', { nullable: true })
  phloDiagram: PhloDiagram;

  @Column('bool', { default: false })
  isPhloDiagramLocked: boolean;

  @UpdateDateColumn()
  lastUpdated: Date;

  // Single embedded analysis record
  @Column('jsonb', { nullable: true })
  analysis: Analysis;
}
