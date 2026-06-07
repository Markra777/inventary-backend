// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Seguridad (Auth)') 
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener Token JWT' }) 
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin_italo' },
        password: { type: 'string', example: '123456' }, // 🔥 CORREGIDO a 'password'
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login exitoso. Retorna el access_token.' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas o usuario no encontrado.' })
  signIn(@Body() signInDto: Record<string, any>) {
    
    // 🔥 ESCUDO ANTI-ERRORES
    // Si Flutter no envía la palabra 'password', rechazamos amablemente sin tumbar el servidor
    if (!signInDto.username || !signInDto.password) {
      throw new UnauthorizedException('Falta enviar el username o el password');
    }

    // Le pasamos el password correcto al servicio
    return this.authService.login(signInDto.username, signInDto.password);
  }
}