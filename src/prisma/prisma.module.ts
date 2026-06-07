import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Esto lo hace disponible en toda la app
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <-- ¡CLAVE! Esto permite que otros módulos lo usen
})
export class PrismaModule {}