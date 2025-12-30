import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

function parseOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix API
  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix);

  // Security middlewares
  app.use(helmet());
  app.use(compression());

  // CORS
  const origins = parseOrigins(process.env.CORS_ORIGINS);
  app.enableCors({
    origin: origins.length ? origins : true, // si no defines, permite (dev)
    credentials: true,
  });

  // Validation (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger opcional
  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('CRM Auto Lote API')
      .setDescription('API docs')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-store-id', in: 'header' }, 'x-store-id')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${prefix}/docs`, app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`✅ API running on http://localhost:${port}/${prefix}`);
}

bootstrap();
