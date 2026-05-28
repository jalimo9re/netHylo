import { MigrationInterface, QueryRunner } from 'typeorm';

export class MvpBillingFoundation1716830000000 implements MigrationInterface {
  name = 'MvpBillingFoundation1716830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_prices_interval_enum" AS ENUM ('one_time','month','year');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_invoices_status_enum" AS ENUM ('draft','open','paid','void');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_subscriptions_status_enum" AS ENUM ('active','canceled','past_due','trialing');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_payments_status_enum" AS ENUM ('pending','succeeded','failed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_products_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_products_tenant_name" ON "billing_products" ("tenant_id","name")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_prices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "interval" "billing_prices_interval_enum" NOT NULL DEFAULT 'one_time',
        "external_price_id" character varying(255) NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_prices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_prices_product" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_prices_tenant_product" ON "billing_prices" ("tenant_id","product_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "deal_id" uuid NULL,
        "status" "billing_invoices_status_enum" NOT NULL DEFAULT 'draft',
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "due_date" TIMESTAMPTZ NULL,
        "paid_at" TIMESTAMPTZ NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_invoices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_invoices_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_billing_invoices_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_invoices_tenant_status" ON "billing_invoices" ("tenant_id","status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_invoice_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_id" uuid NOT NULL,
        "price_id" uuid NULL,
        "description" character varying(500) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_amount" numeric(12,2) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_invoice_items_price" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "price_id" uuid NOT NULL,
        "status" "billing_subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "current_period_start" TIMESTAMPTZ NOT NULL,
        "current_period_end" TIMESTAMPTZ NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "external_subscription_id" character varying(255) NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_subscriptions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_subscriptions_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_billing_subscriptions_price" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_subscriptions_tenant_status" ON "billing_subscriptions" ("tenant_id","status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "invoice_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" "billing_payments_status_enum" NOT NULL DEFAULT 'pending',
        "provider" character varying(50) NOT NULL DEFAULT 'mock_stripe',
        "external_id" character varying(255) NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_billing_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_payments_tenant_status" ON "billing_payments" ("tenant_id","status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_invoice_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_prices_interval_enum"`);
  }
}
