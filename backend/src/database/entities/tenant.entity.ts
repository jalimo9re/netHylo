import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { User } from './user.entity';
import { Integration } from './integration.entity';
import { Contact } from './contact.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

export interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @ManyToOne(() => Plan, (plan) => plan.tenants, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.subAccounts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_tenant_id' })
  parentTenant: Tenant | null;

  @Column({ name: 'parent_tenant_id', nullable: true })
  parentTenantId: string | null;

  @OneToMany(() => Tenant, (tenant) => tenant.parentTenant)
  subAccounts: Tenant[];

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'primary_color', length: 20, nullable: true })
  primaryColor: string | null;

  @Column({ name: 'custom_domain', length: 255, nullable: true })
  customDomain: string | null;

  @Column({ type: 'jsonb', nullable: true })
  branding: TenantBranding | null;

  @Column({ name: 'is_agency', default: false })
  isAgency: boolean;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Integration, (integration) => integration.tenant)
  integrations: Integration[];

  @OneToMany(() => Contact, (contact) => contact.tenant)
  contacts: Contact[];

  @OneToMany(() => Conversation, (conversation) => conversation.tenant)
  conversations: Conversation[];

  @OneToMany(() => Message, (message) => message.tenant)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
