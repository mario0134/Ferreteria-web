import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'ADMIN' | 'VENDEDOR'>) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers?.authorization || '';
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }
    const token = header.slice(7).trim();
    const user = this.authService.verifyToken(token);
    req.user = user;

    const requiredRoles = this.reflector.getAllAndOverride<Array<'ADMIN' | 'VENDEDOR'>>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para realizar esta operación');
    }
    return true;
  }
}
