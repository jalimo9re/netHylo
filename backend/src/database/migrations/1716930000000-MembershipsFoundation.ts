import { MigrationInterface, QueryRunner } from 'typeorm';

export class MembershipsFoundation1716930000000 implements MigrationInterface {
  name = 'MembershipsFoundation1716930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(160) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "slug" character varying(180) NOT NULL,
        "is_published" boolean NOT NULL DEFAULT false,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_courses_tenant_slug" UNIQUE ("tenant_id", "slug"),
        CONSTRAINT "FK_courses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lessons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "title" character varying(160) NOT NULL,
        "slug" character varying(180) NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "position" integer NOT NULL DEFAULT 1,
        "is_published" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_lessons_course_slug" UNIQUE ("course_id", "slug"),
        CONSTRAINT "FK_lessons_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lessons_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lessons_tenant_course_position" ON "lessons" ("tenant_id","course_id","position")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "membership_offers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NULL,
        "name" character varying(180) NOT NULL,
        "slug" character varying(190) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_membership_offers_tenant_slug" UNIQUE ("tenant_id", "slug"),
        CONSTRAINT "FK_membership_offers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_membership_offers_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrollments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "student_name" character varying(160) NULL,
        "student_email" character varying(255) NOT NULL,
        "completedLessonIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "progress" numeric(5,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_enrollments_tenant_course_email" UNIQUE ("tenant_id", "course_id", "student_email"),
        CONSTRAINT "FK_enrollments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enrollments_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "membership_offers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lessons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
  }
}
