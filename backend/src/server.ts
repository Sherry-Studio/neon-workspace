import express from 'express';
import { createApp } from './app';

/**
 * Vercel entrypoint. The Express app is exported as the default export and
 * @vercel/node wraps it as a serverless function (see vercel.json).
 *
 * The DB connection is established lazily on the first request by a middleware
 * in `createApp()`, so nothing here needs to be async.
 *
 * For a long-running host (local dev, a container, Render/Railway), use
 * `src/dev-server.ts`, which binds a port.
 */
const app: express.Express = createApp();

export default app;
