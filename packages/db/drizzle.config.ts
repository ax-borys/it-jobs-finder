import { defineConfig } from 'drizzle-kit';
import { env } from '@job-parser/env';

export default defineConfig({
   out: './drizzle',
   schema: './src/models',
   dialect: 'postgresql',
   dbCredentials: {
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME!,
      host: env.DB_HOST!,
      port: Number(env.DB_PORT),
   },
});
