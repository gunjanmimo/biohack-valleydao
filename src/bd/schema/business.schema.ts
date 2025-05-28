// import { TrackedEntity } from '@shared/models/tracked.entity';
import {
  Column,
  Entity,
  PrimaryColumn,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Project } from 'src/project/schema/project.schema';
import { BusinessPersona } from './business-persona.schema';
import { TargetMarket } from './target-market.schema';
// import { AiBackgroundProcess } from 'src/typings/AiBackgroundProcess';
export enum BusinessTypes {
  B2B = 'B2B',
  B2C = 'B2C',
  C2C = 'C2C',
  C2B = 'C2B',
  B2G = 'B2G',
  G2B = 'G2B',
  G2C = 'G2C',
  G2G = 'G2G',
  C2G = 'C2G',
}

export interface ComparisonData {
  filedName: string;
  filedValue: number;
  groupIndex: number;
}

export interface CRMResearchResult {
  companyName: string;
  companySize?: string;
  contactDetails?: string;
  investmentSeries?: string;
  location?: string;
  dateOfLastContact?: string;
  comparisonData?: ComparisonData[];
}

export interface SalesAcquisitionStrategy {
  outreachChannel: string;
  outreachMethod: string[];
  outreachTiming: string;
  messagePositioning: string[];
  contentChecklist: string[];
  hypothesesToTest: string[];
}

export enum StepStatus {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  HOLD = 'HOLD',
  CANCELLED = 'CANCELLED',
}

export interface BusinessModelCanvas {
  index: number;
  businessModelTitle: string;
  overview: string;
  implementationDetails: string;
  competitionAndDefensibility: string;
  riskAnalysis: string;
  customerDescription: Record<
    'volume' | 'value' | 'churn',
    'high' | 'medium' | 'low'
  >;
  feedback?: string;
  status: StepStatus;
  selected: boolean;
}

export enum BusinessDevelopmentProgressStep {
  MarketResearch = 'marketResearch',
  UniqueValueProposition = 'uniqueValueProposition',
  SalesAcquisitionStrategy = 'salesAcquisitionStrategy',
  BusinessModel = 'businessModel',
}

export interface BusinessDevelopmentProgress {
  [BusinessDevelopmentProgressStep.MarketResearch]: Record<string, StepStatus>;
  [BusinessDevelopmentProgressStep.UniqueValueProposition]: Record<
    string,
    StepStatus
  >;
  [BusinessDevelopmentProgressStep.SalesAcquisitionStrategy]: Record<
    string,
    StepStatus
  >;
  [BusinessDevelopmentProgressStep.BusinessModel]: Record<string, StepStatus>;
}

export interface CRMFilter {
  name: string;
  type: 'location' | 'industry' | 'investmentStage' | 'other';
}

export interface DifferentiationStrategy {
  index: number;
  tagline: string;
  keywords: string[];
  competitionOverview: string;
  featureAndRequirements: string;
  feedback?: string;
  status: StepStatus;
  selected: boolean;
}

export interface KeyAssumption {
  index: number;
  title: string;
  validationCriteria: string;
  validationStrategy: string[];
  addedToWorkpackage: boolean;
  duration: number;
}

export interface CompetitivePricingModel {
  productCompanyName: string;
  productFeatures: string[];
  productLimitations: string[];
  brandWeighting: number;
  additionalBenefits: string;
  productPrice: string;
}

export interface CostBasedPricingModel {
  scale: 'proofOfConcept' | 'marketEntry' | 'marketEstablished';
  costItems: {
    type: 'direct' | 'indirect';
    itemName: string;
    itemDescription: string;
    costUSD: number;
  }[];
  totalCostUSD: number;
}

export interface ValueBasedPricingModel {
  suggestedPriceUSD: number;
  justification: string;
  estimatedCustomerSavingsUSD: number;
  intangibleValueFactors: string[];
}

@Entity()
export class Business {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column('jsonb', { nullable: true })
  businessDevelopmentProgress: BusinessDevelopmentProgress;

  @OneToOne(() => Project, (project) => project.business)
  @JoinColumn({ name: 'id' })
  project: Project;

  @OneToOne(() => BusinessPersona, (persona) => persona.business, {
    cascade: true,
  })
  businessPersona: BusinessPersona;

  @OneToMany(() => TargetMarket, (targetMarket) => targetMarket.business, {
    cascade: true,
  })
  targetMarkets?: TargetMarket[];

  @Column('uuid', { nullable: true })
  selectedTargetMarketId: string;

  @OneToOne(() => TargetMarket, { nullable: true })
  @JoinColumn({ name: 'selectedTargetMarketId' })
  selectedTargetMarket: TargetMarket;

  @Column('jsonb', { nullable: true })
  customerCRMFilter: CRMFilter[];

  @Column('jsonb', { nullable: true })
  competitorCRMFilter: CRMFilter[];

  @Column('jsonb', { nullable: true })
  customerResearchResults: CRMResearchResult[];

  @Column('jsonb', { nullable: true })
  competitorResearchResults: CRMResearchResult[];

  @Column('jsonb', { nullable: true })
  differentiationStrategy: DifferentiationStrategy[];

  @Column('jsonb', { nullable: true })
  salesAcquisitionStrategy: SalesAcquisitionStrategy[];

  @Column('jsonb', { nullable: true })
  businessModelCanvas: BusinessModelCanvas[];

  @Column('jsonb', { nullable: true })
  competitivePricingModel: CompetitivePricingModel[];

  @Column('jsonb', { nullable: true })
  costBasedPricingModel: CostBasedPricingModel[];

  @Column('jsonb', { nullable: true })
  valueBasedPricingModel: ValueBasedPricingModel[];

  @Column('jsonb', { nullable: true })
  keyAssumptions: KeyAssumption[];
}
