import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReputationModule1716830000000 implements MigrationInterface {
  name = 'ReputationModule1716830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "contact_id" uuid NULL,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "message" text NULL,
        "channel" character varying(50) NOT NULL DEFAULT 'link',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_review_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_review_requests_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_review_requests_tenant_created" ON "review_requests" ("tenant_id","createdAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "review_request_id" uuid NOT NULL,
        "contact_id" uuid NULL,
        "token" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NULL,
        "used_at" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_review_links_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_review_links_request" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_review_links_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_links_token" ON "review_links" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_review_links_tenant_request" ON "review_links" ("tenant_id","review_request_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "review_request_id" uuid NULL,
        "review_link_id" uuid NULL,
        "contact_id" uuid NULL,
        "rating" smallint NOT NULL,
        "comment" text NULL,
        "reviewer_name" character varying(255) NULL,
        "reviewer_email" character varying(255) NULL,
        "response" text NULL,
        "responded_at" TIMESTAMPTZ NULL,
        "source" character varying(50) NOT NULL DEFAULT 'link',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_reviews_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_request" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_reviews_link" FOREIGN KEY ("review_link_id") REFERENCES "review_links"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_reviews_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reviews_tenant_created" ON "reviews" ("tenant_id","createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reviews_tenant_rating" ON "reviews" ("tenant_id","rating")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_requests"`);
  }
}
