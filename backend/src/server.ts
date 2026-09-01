import express from 'express';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

// The Express app. On Vercel this module is imported as a serverless function
// and the default export is used directly (see vercel.json → services.backend).
// Locally (and on any long-running host) the block below binds a port.
const app: express.Express = createApp();

export default app;

if (!process.env.VERCEL) {
  connectDatabase()
    .then(() => {
      const server = app.listen(env.PORT, () => {
        logger.info(`🎮  NEON ARCADE API listening on http://localhost:${env.PORT}`);
        if (env.SWAGGER_ENABLED) {
          logger.info(`📚  API docs at http://localhost:${env.PORT}${env.SWAGGER_ROUTE}`);
        }
      });

      const shutdown = async (signal: string) => {
        logger.info(`${signal} received — shutting down`);
        server.close(async () => {
          await disconnectDatabase();
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000).unref();
      };

      process.on('SIGINT', () => void shutdown('SIGINT'));
      process.on('SIGTERM', () => void shutdown('SIGTERM'));
      process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
      process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'uncaughtException — exiting');
        process.exit(1);
      });
    })
    .catch((err) => {
      logger.fatal({ err }, 'Failed to start server');
      process.exit(1);
    });
}
