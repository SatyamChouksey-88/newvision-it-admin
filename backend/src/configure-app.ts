import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import type { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

const httpLog = new Logger('HTTP');

export function configureApp(app: INestApplication): void {
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());

  if (process.env.HTTP_REQUEST_LOG !== 'false') {
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        if (req.path.startsWith('/api/health')) return;
        httpLog.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
      });
      next();
    });
  }

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'X-Row-Count', 'X-Total-Count'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
}

export function swaggerEnabled(): boolean {
  if (process.env.SWAGGER_ENABLED === 'true') return true;
  if (process.env.SWAGGER_ENABLED === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
