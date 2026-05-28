import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  app.useLogger(logger);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API listening on port ${port}`, 'Bootstrap');
}
bootstrap();
