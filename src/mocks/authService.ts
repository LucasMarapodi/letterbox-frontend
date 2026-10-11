import type { User } from '../models';
import type { AuthService } from '../services/authContracts';
import { AuthError } from '../services/authContracts';
import { accountFixtures } from './accounts';

export interface MockAccount { email: string; password: string; user: User; }
export interface MockAuthOptions { accounts?: MockAccount[]; error?: Error; }
export function createMockAuthService(options: MockAuthOptions = {}): AuthService {
  const accounts: MockAccount[] = structuredClone(options.accounts ?? accountFixtures);
  return {
    async register() { throw new Error('Cadastro não implementado.'); },
    async login(credentials): Promise<User> {
      if (options.error) throw options.error;
      const email: string = credentials.email.trim().toLowerCase();
      const account: MockAccount | undefined = accounts.find((candidate) => candidate.email.trim().toLowerCase() === email && candidate.password === credentials.password);
      if (!account) throw new AuthError('invalid-credentials');
      return structuredClone(account.user);
    },
  };
}
