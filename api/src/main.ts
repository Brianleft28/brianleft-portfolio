import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS con soporte para subdominios wildcard
  const allowedDomain = process.env.PORTFOLIO_DOMAIN || 'localhost';
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, curl, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      // En desarrollo, permitir localhost
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        callback(null, true);
        return;
      }

      // En producción, permitir el dominio principal y todos sus subdominios
      const domainPattern = new RegExp(`^https?://([a-z0-9-]+\\.)?${allowedDomain.replace('.', '\\.')}$`, 'i');
      if (domainPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Portfolio API')
      .setDescription('API REST para el portfolio interactivo')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación JWT')
      .addTag('chat', 'Integración con Gemini AI')
      .addTag('filesystem', 'Sistema de archivos virtual')
      .addTag('memories', 'Base de conocimiento para IA')
      .addTag('projects', 'Gestión de proyectos')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
