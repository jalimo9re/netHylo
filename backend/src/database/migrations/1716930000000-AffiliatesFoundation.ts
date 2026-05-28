import { MigrationInterface, QueryRunner } from 'typeorm';

export class AffiliatesFoundation1716930000000 implements MigrationInterface {
  name = 'AffiliatesFoundation1716930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "affiliates_status_enum" AS ENUM ('active','inactive');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "referral_conversions_source_enum" AS ENUM ('manual','billing','campaign');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "referral_conversions_status_enum" AS ENUM ('pending','approved','paid','rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "affiliate_payouts_status_enum" AS ENUM ('pending','paid','failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "affiliates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(140) NOT NULL,
        "email" character varying(255) NULL,
        "status" "affiliates_status_enum" NOT NULL DEFAULT 'active',
        "commission_rate" numeric(5,2) NOT NULL DEFAULT 10,
        "total_clicks" integer NOT NULL DEFAULT 0,
        "total_conversions" integer NOT NULL DEFAULT 0,
        "pending_commission" numeric(12,2) NOT NULL DEFAULT 0,
        "paid_commission" numeric(12,2) NOT NULL DEFAULT 0,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_affiliates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_affiliates_tenant_status" ON "affiliates" ("tenant_id","status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "affiliate_id" uuid NOT NULL,
        "code" character varying(120) NOT NULL,
        "target_url" character varying(500) NULL,
        "clicks" integer NOT NULL DEFAULT 0,
        "conversions" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_clicked_at" TIMESTAMPTZ NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_referral_links_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_referral_links_affiliate" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_links_tenant_affiliate" ON "referral_links" ("tenant_id","affiliate_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_links_code_unique" ON "referral_links" ("code")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_conversions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "affiliate_id" uuid NOT NULL,
        "referral_link_id" uuid NULL,
        "contact_id" uuid NULL,
        "campaign_id" uuid NULL,
        "invoice_id" uuid NULL,
        "source" "referral_conversions_source_enum" NOT NULL DEFAULT 'manual',
        "status" "referral_conversions_status_enum" NOT NULL DEFAULT 'pending',
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "commission_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "occurred_at" TIMESTAMPTZ NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_referral_conversions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_referral_conversions_affiliate" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_referral_conversions_link" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_referral_conversions_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_referral_conversions_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_referral_conversions_invoice" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_conversions_tenant_status" ON "referral_conversions" ("tenant_id","status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_conversions_tenant_source" ON "referral_conversions" ("tenant_id","source")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_conversions_invoice_unique" ON "referral_conversions" ("invoice_id") WHERE "invoice_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "affiliate_payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "affiliate_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" "affiliate_payouts_status_enum" NOT NULL DEFAULT 'pending',
        "notes" text NULL,
        "paid_at" TIMESTAMPTZ NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_affiliate_payouts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_affiliate_payouts_affiliate" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_affiliate_payouts_tenant_status" ON "affiliate_payouts" ("tenant_id","status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "affiliate_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_conversions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "affiliates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "affiliate_payouts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_conversions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_conversions_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "affiliates_status_enum"`);
  }
}
