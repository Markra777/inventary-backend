import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Le decimos que busque el Token en la cabecera (Header) de la petición
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Si el token expiró (pasaron las 12h), lo rechaza automáticamente
      secretOrKey: process.env.JWT_SECRET || '>5x7:=$NT+b%!5/,Rk!-^Zr/]R>g=dzIy6^3Y#E4}XK',
    });
  }

  // Si la firma es correcta y no ha expirado, NestJS ejecuta esta función
  async validate(payload: any) {
    // Lo que retornemos aquí, NestJS lo inyectará en 'request.user'
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}