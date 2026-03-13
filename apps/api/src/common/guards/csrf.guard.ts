import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Request } from 'express';
  
  @Injectable()
  export class CsrfGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;
  
      const skipCsrf = this.reflector.getAllAndOverride<boolean>('skipCsrf', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (skipCsrf) return true;
  
      const request = context.switchToHttp().getRequest<Request>();
  
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (safeMethods.includes(request.method)) return true;
  
      const cookieToken = request.cookies?.['csrf_token'];
      const headerToken = request.headers['x-csrf-token'] as string;
  
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        throw new ForbiddenException('Invalid CSRF token');
      }
  
      return true;
    }
  }