import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkflowRunResult1716900000000 implements MigrationInterface {
  name = 'WorkflowRunResult1716900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ADD COLUMN IF NOT EXISTS "result" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      DROP COLUMN IF EXISTS "result"
    `);
  }
}
