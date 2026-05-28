import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('voice_numbers')
@Index(['tenantId', 'phoneNumber'], { unique: true })
export class VoiceNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'phone_number', length: 50 })
  phoneNumber: string;

  @Column({ name: 'telnyx_connection_id', length: 255 })
  telnyxConnectionId: string;

  @Column({ name: 'friendly_name', length: 255, nullable: true })
  friendlyName: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
