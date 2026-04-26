import { serve } from '@hono/node-server';
import { createCursorsRegistry, getBestCursor, parseJustJoinIt, setRecord, } from '@job-parser/justjoinit-parser';
import { Hono } from 'hono';
const app = new Hono();
const cursorRegistry = createCursorsRegistry();
// TEST. Remove later
const pickRandom = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
};
app.get('/', async (c) => {
    const filter = {
        level: pickRandom(['junior', 'middle', 'senior']),
        tech: pickRandom(['react', 'next.js', 'angular']),
        language: pickRandom(['javascript']),
    };
    const bestCursor = getBestCursor(filter, cursorRegistry);
    const result = await parseJustJoinIt(filter, bestCursor);
    const jobs = result.data;
    setRecord(filter, result.cursor, cursorRegistry);
    console.log(cursorRegistry);
    return c.json(jobs);
});
serve({
    fetch: app.fetch,
    port: 3000,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
