import { Expose, Exclude, Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

/**
 * Safe response shape for a User.
 *
 * `passwordHash` is NEVER included — @Exclude() at the class level means
 * every property is excluded by default. Only fields marked @Expose() are
 * returned, so adding a new column to the User table never auto-exposes it.
 *
 * Used anywhere a User object is returned to the client:
 *   - AuthController (register, login, /me)
 *   - UsersController (list, bdrs)
 *   - Embedded inside lead/call responses as `owner`
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  fullName: string;

  @Expose()
  role: UserRole;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  // passwordHash is intentionally absent — no @Expose(), never returned.
  // updatedAt is internal — not exposed to clients.
}

/**
 * Minimal user shape used when a user is embedded inside another response
 * (e.g. a lead's `owner` field or a call's `agent` field).
 */
@Exclude()
export class UserSummaryDto {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;
}