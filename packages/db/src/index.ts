import { env } from '@job-parser/env';
import 'dotenv/config';
export { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

console.log(process.env.DB_PASSWORD);

const pool = new Pool({
   user: env.DB_USER,
   password: env.DB_PASSWORD,
   host: env.DB_HOST,
   port: Number(env.DB_PORT),
   database: env.DB_NAME,
});

const db = drizzle(pool);

export { db };
