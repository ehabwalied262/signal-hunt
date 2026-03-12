export enum UserRole {
  BDR = 'BDR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role'>;
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}
