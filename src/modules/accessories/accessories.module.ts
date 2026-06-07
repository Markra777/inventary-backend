import { Module } from '@nestjs/common';
import { AccessoriesService } from './accessories.service';
import { AccessoriesController } from './accessories.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // <-- Nunca olvidar esto
  controllers: [AccessoriesController],
  providers: [AccessoriesService],
})
export class AccessoriesModule {}