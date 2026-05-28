import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgencyFoundation1716910000000 implements MigrationInterface {
  name = 'AgencyFoundation1716910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "parent_tenant_id" uuid NULL,
      ADD COLUMN IF NOT EXISTS "logo_url" character varying(500) NULL,
      ADD COLUMN IF NOT EXISTS "primary_color" character varying(20) NULL,
      ADD COLUMN IF NOT EXISTS "custom_domain" character varying(255) NULL,
      ADD COLUMN IF NOT EXISTS "branding" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "is_agency" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tenants"
        ADD CONSTRAINT "FK_tenants_parent" FOREIGN KEY ("parent_tenant_id")
        REFERENCES "tenants"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenants_parent" ON "tenants" ("parent_tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "role" character varying(50) NOT NULL,
        "permission" character varying(100) NOT NULL,
        "granted" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_role_permissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_role_permissions_scope"
      ON "role_permissions" (COALESCE("tenant_id", '00000000-0000-0000-0000-000000000000'::uuid), "role", "permission")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_parent"`);
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP COLUMN IF EXISTS "parent_tenant_id",
      DROP COLUMN IF EXISTS "logo_url",
      DROP COLUMN IF EXISTS "primary_color",
      DROP COLUMN IF EXISTS "custom_domain",
      DROP COLUMN IF EXISTS "branding",
      DROP COLUMN IF EXISTS "is_agency"
    `);
  }
}
