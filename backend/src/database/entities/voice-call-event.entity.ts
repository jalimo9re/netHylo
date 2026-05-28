import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('voice_call_events')
@Index(['tenantId', 'voiceCallId', 'createdAt'])
export class VoiceCallEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'voice_call_id' })
  voiceCallId: string;

  @Column({ name: 'event_type', length: 120 })
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
