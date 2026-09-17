import 'dotenv/config';
import './instrument';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp, swaggerEnabled } from './configure-app';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  configureApp(app);

  if (swaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('NewVision IT Asset Management API')
      .setDescription('Internal IT asset inventory & management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`NewVision backend running on http://localhost:${port}/api`);
}

void bootstrap();
