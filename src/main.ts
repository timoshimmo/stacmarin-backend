import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Enable CORS
  app.enableCors({
    origin: true, // Reflects the request origin. For production, consider a whitelist: ['https://your-frontend-domain.com']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Use a global validation pipe to enforce type-safe DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip away properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  await app.listen(3000);
}
void bootstrap();
