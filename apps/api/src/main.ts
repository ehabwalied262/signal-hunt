import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 4000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS — allow frontend origin
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Global validation pipe — auto-validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // WebSocket adapter (Socket.io)
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(port);
  console.log(`🚀 SignalHunt API running on http://localhost:${port}`);
  console.log(`📡 WebSocket available on ws://localhost:${port}`);
}

bootstrap();
