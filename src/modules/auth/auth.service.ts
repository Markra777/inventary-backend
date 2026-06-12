// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. FUNCIÓN AUXILIAR: Genera ambos tokens
  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username: username, role: role, userId: userId };

    return {
      // El de uso diario (Expira rápido por seguridad: 1 hora)
      access_token: this.jwtService.sign(payload, { expiresIn: '1h' }), 
      
      // La llave maestra (Expira en 7 días)
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), 
    };
  }

  // 🔥 2. FUNCIÓN DE LOGIN CORREGIDA
  async login(username: string, pass: string) {
    // 1. Buscamos al usuario en la base de datos usando tu UsersService
    const user = await this.usersService.findByUsername(username); 
    
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    // 2. Comparamos la contraseña encriptada
    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    // 3. Generamos y retornamos los dos tokens
    return this.generateTokens(user.id, user.username, user.role);
  }

  // 3. LA FUNCIÓN MÁGICA: Renovar Tokens
  async refreshToken(oldRefreshToken: string) {
    try {
      // Intentamos descifrar y validar la llave maestra
      const payload = this.jwtService.verify(oldRefreshToken);

      // Si es válida, le fabricamos un par de llaves 100% nuevas
      return this.generateTokens(payload.sub, payload.username, payload.role);

    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado. Inicia sesión nuevamente.');
    }
  }
}