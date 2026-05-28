import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum VoiceCallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum VoiceCallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  HANGUP = 'hangup',
  MISSED = 'missed',
  FAILED = 'failed',
}

@Entity('voice_calls')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'status'])
@Index(['externalCallControlId'], { unique: true })
export class VoiceCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'voice_number_id', nullable: true })
  voiceNumberId: string | null;

  @Column({ name: 'queue_id', nullable: true })
  queueId: string | null;

  @Column({ name: 'agent_user_id', nullable: true })
  agentUserId: string | null;

  @Column({ name: 'external_call_control_id', nullable: true })
  externalCallControlId: string | null;

  @Column({ name: 'from_number', length: 50 })
  fromNumber: string;

  @Column({ name: 'to_number', length: 50 })
  toNumber: string;

  @Column({ name: 'direction', length: 20 })
  direction: VoiceCallDirection;

  @Column({ name: 'status', length: 20, default: VoiceCallStatus.INITIATED })
  status: VoiceCallStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'queue_wait_seconds', type: 'int', nullable: true })
  queueWaitSeconds: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
