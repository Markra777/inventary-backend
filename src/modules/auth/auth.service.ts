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

  async login(username: string, pass: string) {
    // 1. Buscamos al usuario en la base de datos
    const user = await this.usersService.findByUsername(username);
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.password) {
      throw new UnauthorizedException('El usuario no tiene contraseña registrada');
    }

    // 2. Comparamos la contraseña enviada con el Hash guardado en Neon DB
    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. 🔥 CORRECCIÓN CLAVE: Usamos 'userId' en lugar de 'sub'
    // Esto asegura que inventory.controller.ts pueda leer 'req.user.userId' sin fallar.
    const payload = { userId: user.id, username: user.username, role: user.role };
    
    // 4. Firmamos y devolvemos el Token a la app Flutter
    return {
      access_token: await this.jwtService.signAsync(payload),
      role: user.role, // Le mandamos el rol por si Flutter necesita ocultar cosas
    };
  }
}