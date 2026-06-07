import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // ¡Clave para que no te dé el error de inyección!
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}