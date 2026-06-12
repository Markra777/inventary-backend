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
  @ApiOperation({ summary: 'Iniciar sesión y obtener Tokens JWT' }) 
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin_italo' },
        password: { type: 'string', example: '123456' }, 
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login exitoso. Retorna access_token y refresh_token.' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas o usuario no encontrado.' })
  signIn(@Body() signInDto: Record<string, any>) {
    
    // ESCUDO ANTI-ERRORES
    if (!signInDto.username || !signInDto.password) {
      throw new UnauthorizedException('Falta enviar el username o el password');
    }

    // Ahora la firma coincide perfectamente con el AuthService
    return this.authService.login(signInDto.username, signInDto.password);
  }

  // LA NUEVA RUTA DEL INTERCEPTOR
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar Access Token silenciosamente' })
  async refreshTokens(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Se requiere el refresh token');
    }
    
    return this.authService.refreshToken(body.refreshToken);
  }
}