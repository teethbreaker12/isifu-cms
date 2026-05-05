import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import express = require('express');
import type { Request, Response } from 'express';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  const origins = config.get<string>('CORS_ORIGIN', '').split(',').map((item) => item.trim()).filter(Boolean);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix(apiPrefix);
  app.useStaticAssets(join(process.cwd(), config.get<string>('UPLOAD_DIR', './uploads')), {
    prefix: `/${apiPrefix}/uploads/`,
  });

  const adminSlug = config.get<string>('ADMIN_SLUG', 'admin-xyz').replace(/^\/+|\/+$/g, '');
  const adminDist = join(process.cwd(), config.get<string>('ADMIN_DIST', '../olmedia-cms-admin/dist'));
  app.use(`/${apiPrefix}/health`, (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'OlMedia CMS API' });
  });
  app.use(/^\/$/, (_req: Request, res: Response) => {
    res.redirect(302, `/${adminSlug}/`);
  });
  app.use(new RegExp(`^/${adminSlug}$`), (_req: Request, res: Response) => {
    res.redirect(301, `/${adminSlug}/`);
  });
  app.use(`/${adminSlug}`, express.static(adminDist));
  app.use(new RegExp(`^/${adminSlug}(?:/.*)?$`), (_req: Request, res: Response) => {
    res.sendFile(join(adminDist, 'index.html'));
  });

  await app.listen(config.get<number>('PORT', 3000));
}

bootstrap();
