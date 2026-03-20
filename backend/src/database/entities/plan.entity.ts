import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum PlanName {
  BASIC = 'basic',
  MEDIUM = 'medium',
  FULL = 'full',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PlanName, unique: true })
  name: PlanName;

  @Column({ type: 'int' })
  maxUsers: number;

  @Column({ type: 'int' })
  maxIntegrations: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @OneToMany(() => Tenant, (tenant) => tenant.plan)
  tenants: Tenant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
