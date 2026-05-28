import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';

const env = validateEnv(process.env);

export default new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: ['src/database/entities/*.entity.ts', 'dist/database/entities/*.entity.js'],
  migrations: ['src/database/migrations/*.ts', 'dist/database/migrations/*.js'],
});
