import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';

/**
 * Response shape for login and register endpoints.
 * Returns the safe user object + the access token.
 */
export class AuthResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Expose()
  accessToken: string;
}