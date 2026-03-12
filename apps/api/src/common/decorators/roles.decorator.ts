import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access by user role.
 * Usage: @Roles(UserRole.ADMIN)
 *
 * Must be used together with RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
