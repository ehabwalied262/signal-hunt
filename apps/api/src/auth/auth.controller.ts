import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  SetMetadata,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { AuthResponseDto } from '../common/dto/auth-response.dto';
import { UserResponseDto } from '../common/dto/user-response.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Serialize(AuthResponseDto)
  async register(
    @CurrentUser('role') role: string,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can register new users');
    }
    const result = await this.authService.register(dto);
    res.cookie('signalhunt_token', result.token, COOKIE_OPTIONS);
    return result;
  }

  @Post('login')
  @SetMetadata('isPublic', true)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Serialize(AuthResponseDto)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('signalhunt_token', result.token, COOKIE_OPTIONS);
    return result;
  }
  
/**
 * POST /api/v1/auth/logout
 *
 * Clears the httpOnly cookie. No body needed.
 */

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('signalhunt_token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    return { message: 'Logged out' };
  }

  /**
   * GET /api/v1/auth/csrf-token
   *
   * Sets a non-httpOnly csrf_token cookie that the frontend JS can read
   * and attach as x-csrf-token header on every state-changing request.
   * Called once after login and once on page load.
   */
  @Get('csrf-token')
  @SetMetadata('isPublic', true)
  @SkipThrottle()
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const token = randomBytes(32).toString('hex');

    res.cookie('csrf_token', token, {
      httpOnly: false,          // must be false — JS needs to read this one
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { csrfToken: token };
  }

/**
 * GET /api/v1/auth/ws-token
 *
 * Returns a short-lived JWT for the WebSocket handshake.
 * Needed because the main cookie is httpOnly (JS can't read it),
 * so the socket client fetches this token and passes it in handshake.auth.
 */
  @Get('ws-token')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async getWsToken(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.authService.signWsToken(userId, role);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Serialize(UserResponseDto)
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}