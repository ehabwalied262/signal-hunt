import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user from the request.
 * Usage: @CurrentUser() user: JwtPayload
 *
 * Requires JwtAuthGuard to be applied to the route.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific field is requested, return just that field
    if (data) {
      return user?.[data];
    }

    return user;
  },
);
