import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { AuthResponseDto } from '../common/dto/auth-response.dto';
import { UserResponseDto } from '../common/dto/user-response.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Requires a valid JWT + ADMIN role — only admins can create new accounts.
   * This prevents open self-registration in production.
   *
   * To bootstrap the first admin, seed the DB directly or temporarily
   * comment out @UseGuards(JwtAuthGuard) during initial setup.
   *
   * Rate limit: 5 attempts/min (brute-force/enumeration protection).
   */
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Serialize(AuthResponseDto)
  async register(
    @CurrentUser('role') role: string,
    @Body() dto: RegisterDto,
  ) {
    // Inline role check — swap for a dedicated @Roles + RolesGuard
    // once you add the roles system.
    if (role !== 'ADMIN') {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Only admins can register new users');
    }
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   *
   * Rate limit: 10 attempts/min — slows credential stuffing without
   * locking out legitimate users who mistype a password.
   */
  @Post('login')
  @SetMetadata('isPublic', true)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Serialize(AuthResponseDto)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/v1/auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Serialize(UserResponseDto)
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}