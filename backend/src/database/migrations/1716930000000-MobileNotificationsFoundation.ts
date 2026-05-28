import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobileNotificationsFoundation1716930000000 implements MigrationInterface {
  name = 'MobileNotificationsFoundation1716930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_devices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "platform" character varying(12) NOT NULL,
        "token" character varying(600) NOT NULL,
        "app_version" character varying(32) NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMPTZ NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notification_devices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_devices_token" ON "notification_devices" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_devices_tenant_user" ON "notification_devices" ("tenant_id", "user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "type" character varying(60) NOT NULL,
        "title" character varying(180) NOT NULL,
        "body" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "delivery_count" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notification_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_events_tenant_created" ON "notification_events" ("tenant_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_events_tenant_user_read" ON "notification_events" ("tenant_id", "user_id", "read_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_devices"`);
  }
}
