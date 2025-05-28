import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

import { Business } from './business.schema';
import { MarketSegment } from './market-segment.schema';

export interface MarketSize {
  value: number;
  currency: string;
  unit: string;
  year: number;
}

export interface CAGR {
  ratePercent: number;
  period: {
    startYear: number;
    endYear: number;
  };
}

export interface Saturation {
  stage: string;
  competitionLevel: string;
  opportunityLevel: string;
}

@Entity()
export class TargetMarket {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column('varchar', { nullable: false })
  name: string;

  @Column('jsonb', { nullable: true })
  marketSize: MarketSize;

  @Column('jsonb', { nullable: true })
  cagr: CAGR;

  @Column('jsonb', { nullable: true })
  keyHighlights: string[];

  @Column('jsonb', { nullable: true })
  saturation: Saturation;

  @Column('jsonb', { nullable: true })
  opportunities: string[];

  @Column('jsonb', { nullable: true })
  challenges: string[];

  @Column('jsonb', { nullable: true })
  sources: string[];

  @Column('boolean', { default: false })
  selected: boolean;

  @Column('text', { nullable: true })
  description: string;

  @OneToMany(
    () => MarketSegment,
    (marketSegment) => marketSegment.targetMarket,
    { cascade: true },
  )
  marketSegments: MarketSegment[];

  @OneToOne(() => MarketSegment, { nullable: true })
  @JoinColumn({ name: 'selectedMarketSegmentId' })
  selectedMarketSegment: MarketSegment;

  @Column('uuid', { nullable: true })
  selectedMarketSegmentId: string;

  @ManyToOne(() => Business, (business) => business.targetMarkets)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'uuid' })
  businessId: string;
}
