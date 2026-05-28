import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrmTasksFoundation1716940000000 implements MigrationInterface {
  name = 'CrmTasksFoundation1716940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."crm_tasks_status_enum" AS ENUM('open', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "crm_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "deal_id" uuid,
        "title" character varying(255) NOT NULL,
        "notes" text,
        "assignee_user_id" uuid,
        "due_at" TIMESTAMP WITH TIME ZONE,
        "status" "public"."crm_tasks_status_enum" NOT NULL DEFAULT 'open',
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "due_soon_triggered_at" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_tasks_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_crm_tasks_tenant_deal_status" ON "crm_tasks" ("tenant_id", "deal_id", "status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_crm_tasks_tenant_assignee_due" ON "crm_tasks" ("tenant_id", "assignee_user_id", "due_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "crm_tasks" ADD CONSTRAINT "FK_crm_tasks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "crm_tasks" ADD CONSTRAINT "FK_crm_tasks_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crm_tasks" DROP CONSTRAINT "FK_crm_tasks_deal"`);
    await queryRunner.query(`ALTER TABLE "crm_tasks" DROP CONSTRAINT "FK_crm_tasks_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_tasks_tenant_assignee_due"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_tasks_tenant_deal_status"`);
    await queryRunner.query(`DROP TABLE "crm_tasks"`);
    await queryRunner.query(`DROP TYPE "public"."crm_tasks_status_enum"`);
  }
}
