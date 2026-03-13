import {
    UseInterceptors,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Injectable,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  import { plainToInstance } from 'class-transformer';
  
  interface ClassConstructor {
    new (...args: any[]): object;
  }
  
  /**
   * Serialize interceptor — transforms a plain object or Prisma model into
   * an instance of the specified DTO class, applying @Expose()/@Exclude() rules.
   *
   * Usage on a controller method:
   *
   *   @Serialize(UserResponseDto)
   *   @Get('me')
   *   getProfile() { ... }
   *
   * The interceptor runs AFTER the handler returns, so the service can return
   * the raw Prisma object — the DTO class controls what reaches the client.
   *
   * Why not just use ClassSerializerInterceptor globally?
   * Global ClassSerializerInterceptor requires every return value to be a
   * class instance. Most of our responses are plain objects (leads list with
   * meta pagination, call history arrays, etc.) which would need extra wrapping.
   * This decorator gives surgical per-route control with zero overhead on routes
   * that return plain objects and don't need transformation.
   */
  @Injectable()
  export class SerializeInterceptor implements NestInterceptor {
    constructor(private dto: ClassConstructor) {}

    intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
      return handler.handle().pipe(
        map((data: any) => {
          // JSON round-trip converts Prisma-specific types (Decimal, Date, BigInt)
          // into plain JSON-safe values before class-transformer touches them.
          // Without this, plainToInstance tries to recurse into Decimal objects
          // and throws "[DecimalError] Invalid argument: undefined".
          const plain = JSON.parse(JSON.stringify(data));
          return plainToInstance(this.dto, plain, {
            excludeExtraneousValues: true,
          });
        }),
      );
    }
  }
  
  /**
   * Convenience decorator — use this instead of @UseInterceptors(new SerializeInterceptor(Dto))
   *
   * @example
   *   @Serialize(UserResponseDto)
   *   @Get('me')
   *   getProfile() { ... }
   */
  export function Serialize(dto: ClassConstructor) {
    return UseInterceptors(new SerializeInterceptor(dto));
  }