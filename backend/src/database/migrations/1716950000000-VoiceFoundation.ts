import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoiceFoundation1716950000000 implements MigrationInterface {
  name = 'VoiceFoundation1716950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "voice_numbers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "phone_number" character varying(50) NOT NULL,
        "telnyx_connection_id" character varying(255) NOT NULL,
        "friendly_name" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_numbers_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_voice_numbers_tenant_phone" UNIQUE ("tenant_id", "phone_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voice_calls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "voice_number_id" uuid,
        "queue_id" uuid,
        "agent_user_id" uuid,
        "external_call_control_id" character varying,
        "from_number" character varying(50) NOT NULL,
        "to_number" character varying(50) NOT NULL,
        "direction" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'initiated',
        "started_at" TIMESTAMP,
        "answered_at" TIMESTAMP,
        "ended_at" TIMESTAMP,
        "duration_seconds" integer,
        "queue_wait_seconds" integer,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_calls_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_voice_calls_external" ON "voice_calls" ("external_call_control_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_voice_calls_tenant_created" ON "voice_calls" ("tenant_id", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_voice_calls_tenant_status" ON "voice_calls" ("tenant_id", "status")`);

    await queryRunner.query(`
      CREATE TABLE "voice_agent_status" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'offline',
        "last_changed_at" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_agent_status_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_voice_agent_status_tenant_user" UNIQUE ("tenant_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voice_queues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "strategy" character varying(40) NOT NULL DEFAULT 'round_robin',
        "ring_timeout_seconds" integer NOT NULL DEFAULT 30,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_queues_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_voice_queues_tenant_name" UNIQUE ("tenant_id", "name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voice_queue_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "queue_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "priority" integer NOT NULL DEFAULT 100,
        "is_active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_queue_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_voice_queue_members_tuple" UNIQUE ("tenant_id", "queue_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voice_call_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "voice_call_id" uuid NOT NULL,
        "event_type" character varying(120) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voice_call_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_voice_call_events_lookup" ON "voice_call_events" ("tenant_id", "voice_call_id", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_call_events_lookup"`);
    await queryRunner.query(`DROP TABLE "voice_call_events"`);
    await queryRunner.query(`DROP TABLE "voice_queue_members"`);
    await queryRunner.query(`DROP TABLE "voice_queues"`);
    await queryRunner.query(`DROP TABLE "voice_agent_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_calls_tenant_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_calls_tenant_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voice_calls_external"`);
    await queryRunner.query(`DROP TABLE "voice_calls"`);
    await queryRunner.query(`DROP TABLE "voice_numbers"`);
  }
}
