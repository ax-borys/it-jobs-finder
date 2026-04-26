import { serve } from '@hono/node-server';
import {
   createCursorsRegistry,
   getBestCursor,
   parseJustJoinIt,
   setRecord,
   type Filter,
} from '@job-parser/justjoinit-parser';
import { Hono } from 'hono';

const app = new Hono();

const cursorRegistry = createCursorsRegistry();

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

   setRecord(filter, result.cursor, cursorRegistry);

   console.log(cursorRegistry);

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
