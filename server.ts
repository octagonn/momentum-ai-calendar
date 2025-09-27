import { serve } from '@hono/node-server';
import app from './backend/hono';

const port = process.env.PORT || 3001;

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port: port,
}, (info) => {
  console.log(`Server is running at http://localhost:${info.port}`);
});

