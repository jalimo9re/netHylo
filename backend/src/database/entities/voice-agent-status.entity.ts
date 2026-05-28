import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum VoiceAgentPresence {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

@Entity('voice_agent_status')
@Index(['tenantId', 'userId'], { unique: true })
export class VoiceAgentStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'status', length: 20, default: VoiceAgentPresence.OFFLINE })
  status: VoiceAgentPresence;

  @Column({ name: 'last_changed_at', type: 'timestamp' })
  lastChangedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
