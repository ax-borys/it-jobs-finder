import { serve } from '@hono/node-server';
import { parseJustJoinIt } from '@job-parser/justjoinit-parser';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
   const jobs = await parseJustJoinIt();
   return c.json(jobs);
});

serve(
   {
      fetch: app.fetch,
      port: 3000,
   },
   (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
   },
);
