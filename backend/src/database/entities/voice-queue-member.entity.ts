import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('voice_queue_members')
@Index(['tenantId', 'queueId', 'userId'], { unique: true })
export class VoiceQueueMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'queue_id' })
  queueId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'priority', type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
