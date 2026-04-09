// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const env = config.get<string>('NODE_ENV', 'development');

  // ── Security ───────────────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: env === 'production',
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  });

  // ── API versioning ─────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // ── Global pipes ───────────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // ── Global filters & interceptors ──────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger API docs ───────────────────────────────────────────────────────
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IB Marketplace API v4')
      .setDescription('European B2B & B2G Commerce Platform — Technical API')
      .setVersion('4.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('auth', 'Authentication & session management')
      .addTag('users', 'Entity profiles & KYB')
      .addTag('listings', 'Product & service listings')
      .addTag('orders', 'Order management & escrow')
      .addTag('rfq', 'Request for Quotation')
      .addTag('messaging', 'Business messaging')
      .addTag('location', 'Location management & geo-search (v4)')
      .addTag('search', 'Marketplace search & discovery')
      .addTag('procurement', 'Public procurement (B2G)')
      .addTag('payments', 'Payments & invoicing')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║         IB MARKETPLACE API v4.0 — STARTED                    ║
  ║         B2B/B2G · 20 Countries · EU + UK                     ║
  ╠═══════════════════════════════════════════════════════════════╣
  ║  Port:  ${port}                                                  ║
  ║  Env:   ${env.padEnd(10)}                                       ║
  ║  Docs:  http://localhost:${port}/api/docs                        ║
  ╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
