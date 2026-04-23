import { serve } from '@hono/node-server';
import { parseJustJoinIt } from '@job-parser/justjoinit-parser';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
   const twoHoursAgo = new Date();
   twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

   const jobs = await parseJustJoinIt({
      ctx: { lastHandledDate: twoHoursAgo },
   });

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
