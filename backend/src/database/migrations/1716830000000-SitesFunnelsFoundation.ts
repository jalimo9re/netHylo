import { MigrationInterface, QueryRunner } from 'typeorm';

export class SitesFunnelsFoundation1716830000000 implements MigrationInterface {
  name = 'SitesFunnelsFoundation1716830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(160) NOT NULL,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "published_at" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sites_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sites_tenant_slug" ON "sites" ("tenant_id","slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_pages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(160) NOT NULL,
        "blocks" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_site_pages_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_site_pages_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_pages_site_slug" ON "site_pages" ("site_id","slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funnels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(160) NOT NULL,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "published_at" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_funnels_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_funnels_tenant_slug" ON "funnels" ("tenant_id","slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funnel_steps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "funnel_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "step_order" integer NOT NULL,
        "page_id" uuid NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_funnel_steps_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funnel_steps_funnel" FOREIGN KEY ("funnel_id") REFERENCES "funnels"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funnel_steps_page" FOREIGN KEY ("page_id") REFERENCES "site_pages"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_funnel_steps_funnel_order" ON "funnel_steps" ("funnel_id","step_order")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funnel_analytics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "funnel_id" uuid NOT NULL,
        "step_id" uuid NULL,
        "event_type" character varying(30) NOT NULL,
        "session_id" character varying(120) NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_funnel_analytics_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funnel_analytics_funnel" FOREIGN KEY ("funnel_id") REFERENCES "funnels"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funnel_analytics_step" FOREIGN KEY ("step_id") REFERENCES "funnel_steps"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_funnel_analytics_funnel_step_event" ON "funnel_analytics" ("funnel_id","step_id","event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_funnel_analytics_tenant_created" ON "funnel_analytics" ("tenant_id","createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funnel_analytics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funnel_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funnels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_pages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sites"`);
  }
}
