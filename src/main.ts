import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS (Permite que otras apps se conecten)
  app.enableCors();

  // 🔥 2. AUMENTAR EL LÍMITE DE PESO A 50MB (Para la sincronización masiva)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Cálidda ERP API')
    .setDescription('API para inventario y técnicos de campo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 🔥 EL CAMBIO CLAVE: Escuchar el puerto de Render o el 3000 si estás en tu PC
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en el puerto: ${port}`);
}
bootstrap();