import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AccessoriesModule } from './modules/accessories/accessories.module';

@Module({
  imports: [AuthModule, InventoryModule, PrismaModule, UsersModule, AccessoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
