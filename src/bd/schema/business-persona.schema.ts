import { Column, Entity, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';

import { Business } from './business.schema';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated',
  ENGAGED = 'engaged',
}

@Entity()
export class BusinessPersona {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  occupation: string;

  @Column('text')
  gender: Gender;

  @Column('text')
  maritalStatus: MaritalStatus;

  @Column('jsonb')
  keyTraits: string[];

  @Column('text')
  personalityType: string;

  @Column('jsonb')
  purchaseDrivers: string[];

  @Column('jsonb')
  preferredBrands: string[];

  @Column('text')
  biography: string;

  @Column('jsonb')
  painPoints: string[];

  @Column('jsonb')
  communityTouchpoints: string[];

  @Column('jsonb')
  purchaseFrequency: Record<string, number>;

  @OneToOne(() => Business, (business) => business.businessPersona)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column('uuid')
  businessId: string;
}
