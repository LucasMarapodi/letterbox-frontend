import type { User } from '../models';
import type { AuthService } from '../services/authContracts';

export interface MockAccount { email: string; password: string; user: User; }
export interface MockAuthOptions { accounts?: MockAccount[]; error?: Error; }
export function createMockAuthService(_options: MockAuthOptions = {}): AuthService {
  return { async login() { throw new Error('Login não implementado.'); } };
}
