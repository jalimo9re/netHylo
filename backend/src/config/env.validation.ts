type EnvMap = Record<string, string | undefined>;

const requiredVars = [
  'CORS_ORIGIN',
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'JWT_SECRET',
] as const;

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseNumber = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${name}: "${value}"`);
  }
  return parsed;
};

export function validateEnv(config: EnvMap): EnvMap {
  const missing = requiredVars.filter((name) => !config[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const allowedNodeEnv = ['development', 'test', 'production'] as const;
  const nodeEnv = config.NODE_ENV ?? 'development';
  if (!allowedNodeEnv.includes(nodeEnv as (typeof allowedNodeEnv)[number])) {
    throw new Error(`Invalid NODE_ENV: "${nodeEnv}"`);
  }

  const jwtSecret = config.JWT_SECRET ?? '';
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters long');
  }

  const normalized: EnvMap = {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: String(parseNumber('PORT', config.PORT, 3000)),
    DB_PORT: String(parseNumber('DB_PORT', config.DB_PORT, 5432)),
    REDIS_PORT: String(parseNumber('REDIS_PORT', config.REDIS_PORT, 6379)),
    DB_SYNCHRONIZE: String(parseBoolean(config.DB_SYNCHRONIZE, false)),
    DB_MIGRATIONS_RUN: String(parseBoolean(config.DB_MIGRATIONS_RUN, false)),
    JWT_EXPIRATION: config.JWT_EXPIRATION ?? '24h',
    TELNYX_API_KEY: config.TELNYX_API_KEY ?? '',
    TELNYX_CONNECTION_ID: config.TELNYX_CONNECTION_ID ?? '',
    TELNYX_WEBHOOK_SECRET: config.TELNYX_WEBHOOK_SECRET ?? '',
    SOCIAL_MOCK: String(parseBoolean(config.SOCIAL_MOCK, true)),
  };

  if (normalized.TELNYX_CONNECTION_ID && normalized.TELNYX_CONNECTION_ID.length < 6) {
    throw new Error('TELNYX_CONNECTION_ID parece inválido');
  }

  return normalized;
}
