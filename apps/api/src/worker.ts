import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Worker entry point.
 * Boots the NestJS app but does NOT listen on HTTP.
 * BullMQ processors registered via @Processor() decorators
 * will start consuming jobs automatically.
 */
async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('🔧 SignalHunt Worker started — processing background jobs');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Worker shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Worker shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker();
