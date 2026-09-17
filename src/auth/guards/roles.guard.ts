import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, User } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, access granted
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user || !user.role) {
        this.logger.warn(`Access denied: No user or role found in request. User: ${JSON.stringify(user)}`);
        return false; // No user or role found, deny access
    }

    const hasRole = requiredRoles.some((role) => String(user.role).toLowerCase() === String(role).toLowerCase());
    
    if (!hasRole) {
        this.logger.warn(`Access denied: User role "${user.role}" does not match required roles [${requiredRoles.join(', ')}]. User: ${user.email}`);
    }

    //return requiredRoles.some((role) => user.role === role);

    return hasRole;

  }
}
