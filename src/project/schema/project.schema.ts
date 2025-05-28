import { Column, Entity, Generated, PrimaryColumn, OneToOne } from 'typeorm';
import { Copilot } from '../../td/schema/copilot.schema';
import { Business } from 'src/bd/schema/business.schema';
@Entity()
export class Project {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  summary: string;

  @Column({ type: 'varchar', length: 20000, nullable: true })
  methodology?: string;

  @Column({ type: 'varchar', length: 20000, nullable: true })
  impact?: string;

  @Column({ type: 'int', nullable: true })
  trl?: number;

  @OneToOne(() => Copilot, (copilot: Copilot) => copilot.project, {
    cascade: true,
    nullable: true,
  })
  copilot?: Copilot;

  @OneToOne(() => Business, (business) => business.project, {
    cascade: true,
    nullable: true,
  })
  business?: Business;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
