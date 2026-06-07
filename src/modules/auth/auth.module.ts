import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy'; // <-- Importamos la estrategia

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'MiSuperSecretoCalidda2026!ParaFirmarTokens',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  providers: [AuthService, JwtStrategy], // <-- Añadimos JwtStrategy aquí
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}