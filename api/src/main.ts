import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env before any other imports (required for GOOGLE_APPLICATION_CREDENTIALS, DATABASE_URL, etc.)
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Serve static files from uploads directory
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(PORT, '0.0.0.0');
  console.log(`API running on http://0.0.0.0:${PORT}`);
}
bootstrap();
