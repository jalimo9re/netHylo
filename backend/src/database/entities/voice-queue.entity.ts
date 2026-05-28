import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('voice_queues')
@Index(['tenantId', 'name'], { unique: true })
export class VoiceQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'strategy', length: 40, default: 'round_robin' })
  strategy: string;

  @Column({ name: 'ring_timeout_seconds', type: 'int', default: 30 })
  ringTimeoutSeconds: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
