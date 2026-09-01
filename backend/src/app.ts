import path from 'node:path';
import express, { type Express } from 'express';
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

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server (no Origin header) and whitelisted origins.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
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

  app.use('/api', globalLimiter);

  // API docs — enabled by default in dev; guard/disable in production via env.
  if (env.SWAGGER_ENABLED) {
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
