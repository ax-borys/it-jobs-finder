import { env } from '@job-parser/env';
export { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
   user: env.DB_USER,
   password: env.DB_PASSWORD,
   host: env.DB_HOST,
   port: Number(env.DB_PORT),
   database: env.DB_NAME,
});

const db = drizzle(pool);

export { db };
export type { Vacancy, NewVacancy } from './models/vacancy';
