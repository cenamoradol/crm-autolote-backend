import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  const enabled = process.env.AUDIT_ENABLED === 'true';

  if (!enabled) {
    // eslint-disable-next-line no-console
    console.log('👷 Worker NOT started (AUDIT_ENABLED=false)');
    return;
  }

  // No HTTP server, solo levanta el contexto Nest para processors
  await NestFactory.createApplicationContext(WorkerModule);

  // eslint-disable-next-line no-console
  console.log('👷 Worker running (BullMQ processors active)');
}

bootstrap();
