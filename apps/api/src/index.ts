import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import {
   createCursorRegistry,
   getBestCursor,
   parseJustJoinIt,
   upsertCursor,
   type Filter,
} from '@job-parser/justjoinit-parser';
import { db, sql } from '@job-parser/db';

const PORT = process.env.NODE_ENV === 'production' ? 80 : 3000;
const HOST = '0.0.0.0';

const app = new Hono();

const cursorRegistry = createCursorRegistry();

// TEST. Remove later
const pickRandom = (arr: string[]) => {
   return arr[Math.floor(Math.random() * arr.length)];
};

app.get('/', async (c) => {
   const filter: Filter = {
      level: pickRandom(['junior', 'middle', 'senior']) as Filter['level'],
      tech: pickRandom(['react', 'next.js', 'angular']) as Filter['tech'],
      language: pickRandom(['javascript']) as Filter['language'],
   };

   const bestCursor = getBestCursor(filter, cursorRegistry);

   const result = await parseJustJoinIt(filter, bestCursor);

   const jobs = result.data;

   upsertCursor(filter, result.cursor, cursorRegistry);

   console.log(cursorRegistry);

   return c.json(jobs);
});

app.get('/health', async (c) => {
   const services_status: { database: 'Active' | 'Dead' | null } = {
      database: null,
   };

   try {
      await db.execute(sql`select 1`);
      services_status.database = 'Active';
   } catch (error) {
      console.error(error);
      services_status.database = 'Dead';
   }

   return c.json(services_status);
});

serve(
   {
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
   },
   (info) => {
      console.log(`Server is running on http://${HOST}:${info.port}`);
      console.log('Mode: ', process.env.NODE_ENV || 'development');
   },
);
