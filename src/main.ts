import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS (Permite que otras apps se conecten)
  app.enableCors();

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