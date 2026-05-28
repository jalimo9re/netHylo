import { MigrationInterface, QueryRunner } from 'typeorm';

export class SocialPlannerModule1717000000000 implements MigrationInterface {
  name = 'SocialPlannerModule1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "platform" character varying(50) NOT NULL,
        "handle" character varying(120) NOT NULL,
        "display_name" character varying(150) NULL,
        "status" character varying(20) NOT NULL DEFAULT 'connected',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "last_synced_at" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_social_accounts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_accounts_tenant_platform" ON "social_accounts" ("tenant_id","platform")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "content" text NOT NULL,
        "channels" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMPTZ NULL,
        "published_at" TIMESTAMPTZ NULL,
        "error" text NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_social_posts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_posts_tenant_status" ON "social_posts" ("tenant_id","status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_posts_tenant_scheduled" ON "social_posts" ("tenant_id","scheduled_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_post_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "level" character varying(20) NOT NULL DEFAULT 'info',
        "message" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_social_post_logs_post" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_post_logs_post_created" ON "social_post_logs" ("post_id","createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "social_post_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_accounts"`);
  }
}
