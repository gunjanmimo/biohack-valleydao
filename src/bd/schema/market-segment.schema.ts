import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TargetMarket } from './target-market.schema';

interface QuestionAnswer {
  question?: string;
  statement?: string;
  score?: number;
}

@Entity()
export class MarketSegment {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column('varchar', { nullable: false })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('float', { nullable: true })
  segmentSize: number;

  @Column('jsonb', { nullable: true })
  questionAnswers: QuestionAnswer[];

  @ManyToOne(
    () => TargetMarket,
    (targetMarket) => targetMarket.marketSegments,
    { nullable: true },
  )
  @JoinColumn({ name: 'targetMarketId' })
  targetMarket: TargetMarket;

  @Column('uuid', { nullable: true })
  targetMarketId: string;
}
