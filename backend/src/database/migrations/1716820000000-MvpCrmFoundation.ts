import { MigrationInterface, QueryRunner } from 'typeorm';

export class MvpCrmFoundation1716820000000 implements MigrationInterface {
  name = 'MvpCrmFoundation1716820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_pipelines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "stages" jsonb NOT NULL DEFAULT '["New Lead","Qualified","Proposal","Won","Lost"]',
        "is_default" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_crm_pipelines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_crm_pipelines_tenant_name" ON "crm_pipelines" ("tenant_id","name")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_deals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "pipeline_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "stage" character varying(100) NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "probability" integer NOT NULL DEFAULT 0,
        "owner_user_id" uuid NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_crm_deals_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_crm_deals_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_crm_deals_pipeline" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crm_deals_tenant_pipeline_stage" ON "crm_deals" ("tenant_id","pipeline_id","stage")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(160) NOT NULL,
        "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_forms_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_forms_tenant_slug" ON "forms" ("tenant_id","slug")`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "workflow_runs_status_enum" AS ENUM ('pending','running','completed','failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflows" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "trigger" character varying(100) NOT NULL,
        "steps" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_workflows_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workflows_tenant_name" ON "workflows" ("tenant_id","name")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "workflow_id" uuid NOT NULL,
        "status" "workflow_runs_status_enum" NOT NULL DEFAULT 'pending',
        "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "error" text NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_workflow_runs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_runs_workflow" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workflow_runs_tenant_workflow_status" ON "workflow_runs" ("tenant_id","workflow_id","status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "deal_id" uuid NULL,
        "title" character varying(255) NOT NULL,
        "startAt" TIMESTAMP NOT NULL,
        "endAt" TIMESTAMP NOT NULL,
        "timezone" character varying(80) NOT NULL DEFAULT 'UTC',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_calendar_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_calendar_events_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_calendar_events_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calendar_events_tenant_start" ON "calendar_events" ("tenant_id","startAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "form_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "deal_id" uuid NULL,
        "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "utm" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ip_address" character varying NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_form_submissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_form_submissions_form" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_form_submissions_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_form_submissions_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_form_submissions_tenant_form_created" ON "form_submissions" ("tenant_id","form_id","createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "form_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_deals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_pipelines"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workflow_runs_status_enum"`);
  }
}
