import path from 'node:path';
import express, { type Express } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isProd, isTest } from './config/env';
import { logger } from './config/logger';
import { openapiSpec } from './config/openapi';
import { requestId } from './middleware/requestId';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import apiRoutes from './routes';
import { ApiError } from './utils/ApiError';
import { connectDatabase } from './config/database';

/** Origin is allowed if whitelisted, or (on Vercel) any *.vercel.app domain. */
function isAllowedOrigin(origin: string): boolean {
  if (env.CORS_ORIGINS.includes(origin)) return true;
  let host = '';
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (process.env.VERCEL && host.endsWith('.vercel.app')) return true;
  if (
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    host === process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return true;
  }
  return false;
}

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server (no Origin header) and allowed origins.
        if (!origin || isAllowedOrigin(origin)) return cb(null, true);
        cb(new ApiError(403, `Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(hpp());

  if (!isTest) {
    app.use(
      morgan(isProd ? 'combined' : 'dev', {
        stream: { write: (msg) => logger.info(msg.trim()) },
      }),
    );
  }

  // Locally-stored uploads (STORAGE_PROVIDER=local). In production images are
  // served from Cloudinary/S3 and this route simply serves nothing.
  app.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), 'uploads'), {
      maxAge: '7d',
      fallthrough: true,
    }),
  );

  // Ensure a live DB connection before handling anything that needs one.
  // Cheap after the first request (the connection is cached); in tests the
  // connection is already open (readyState 1) so this is a no-op.
  app.use((req, _res, next) => {
    if (mongoose.connection.readyState === 1 || req.path === '/api/health') return next();
    connectDatabase().then(() => next(), next);
  });

  app.use('/api', globalLimiter);

  // API docs — enabled by default in dev; guard/disable in production via env.
  // swagger-ui-express relies on express.static, which is a no-op on Vercel.
  if (env.SWAGGER_ENABLED && !process.env.VERCEL) {
    app.use(
      env.SWAGGER_ROUTE,
      swaggerUi.serve,
      swaggerUi.setup(openapiSpec as unknown as Record<string, unknown>, {
        customSiteTitle: 'NEON ARCADE API',
      }),
    );
    app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));
  }

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'NEON ARCADE API',
      data: { version: '1.0.0', docs: env.SWAGGER_ENABLED ? env.SWAGGER_ROUTE : null },
    });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
