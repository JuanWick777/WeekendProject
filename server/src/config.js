import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().min(1).optional(),
  APP_ORIGIN: z.url().default('http://127.0.0.1:5173'),
});

export function readConfig(env = process.env) {
  const values = configSchema.parse(env);
  return Object.freeze({
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    host: values.HOST ?? (values.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
    appOrigin: values.APP_ORIGIN,
  });
}
