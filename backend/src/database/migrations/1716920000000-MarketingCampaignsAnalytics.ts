import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingCampaignsAnalytics1716920000000 implements MigrationInterface {
  name = 'MarketingCampaignsAnalytics1716920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "campaigns_channel_enum" AS ENUM ('email','sms');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "campaigns_status_enum" AS ENUM ('draft','scheduled','sending','completed','cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "campaign_recipients_status_enum" AS ENUM ('pending','sent','failed','bounced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "campaign_events_type_enum" AS ENUM ('sent','opened','clicked','bounced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "channel" "campaigns_channel_enum" NOT NULL,
        "status" "campaigns_status_enum" NOT NULL DEFAULT 'draft',
        "subject" character varying(255) NULL,
        "body" text NOT NULL,
        "scheduled_at" TIMESTAMPTZ NULL,
        "started_at" TIMESTAMPTZ NULL,
        "completed_at" TIMESTAMPTZ NULL,
        "contact_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_campaigns_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaigns_tenant_status" ON "campaigns" ("tenant_id","status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_recipients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "to_email" character varying(255) NULL,
        "to_phone" character varying(50) NULL,
        "status" "campaign_recipients_status_enum" NOT NULL DEFAULT 'pending',
        "external_id" character varying(255) NULL,
        "error" text NULL,
        "sent_at" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_campaign_recipients_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_campaign_recipients_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaign_recipients_campaign_status" ON "campaign_recipients" ("campaign_id","status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "recipient_id" uuid NULL,
        "event_type" "campaign_events_type_enum" NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_campaign_events_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_campaign_events_recipient" FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaign_events_campaign_type" ON "campaign_events" ("campaign_id","event_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_events_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_recipients_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaigns_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaigns_channel_enum"`);
  }
}
