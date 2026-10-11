import type { User } from '../models';

export interface LoginCredentials { email: string; password: string; }
export interface AuthService { login(credentials: LoginCredentials): Promise<User>; }
export type AuthErrorCode = 'invalid-credentials' | 'duplicate-email' | 'invalid-fields';
export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) { super(code); this.name = 'AuthError'; }
}
