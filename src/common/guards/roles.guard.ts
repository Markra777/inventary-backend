import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Si no hay roles requeridos, deja pasar a cualquiera con Token
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Si el usuario tiene el rol requerido, pasa. Si no, le damos un error 403 Forbidden.
    if (requiredRoles.includes(user.role)) {
      return true;
    } else {
      throw new ForbiddenException('No tienes permisos de Analista para ver esta información');
    }
  }
}