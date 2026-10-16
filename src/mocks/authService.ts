import type { User } from '../models';
import type { AuthService } from '../services/authContracts';
import { AuthError } from '../services/authContracts';
import { accountFixtures } from './accounts';

export interface MockAccount { email: string; password: string; user: User; }
export interface MockAuthOptions { accounts?: MockAccount[]; error?: Error; }
export function createMockAuthService(options: MockAuthOptions = {}): AuthService {
  const accounts: MockAccount[] = structuredClone(options.accounts ?? accountFixtures);
  let sequence = 1;
  return {
    async register(input): Promise<User> {
      if (options.error) throw options.error;
      const email = input.email.trim().toLowerCase();
      if (accounts.some((account) => account.email.trim().toLowerCase() === email)) throw new AuthError('duplicate-email');
      while (accounts.some((account) => account.user.id === `mock-user-${sequence}`)) sequence++;
      const id = `mock-user-${sequence++}`;
      const user: User = { id, username: id, displayName: input.name.trim(), avatarUrl: null, bio: '' };
      accounts.push({ email, password: input.password, user });
      return structuredClone(user);
    },
    async login(credentials): Promise<User> {
      if (options.error) throw options.error;
      const email: string = credentials.email.trim().toLowerCase();
      const account: MockAccount | undefined = accounts.find((candidate) => candidate.email.trim().toLowerCase() === email && candidate.password === credentials.password);
      if (!account) throw new AuthError('invalid-credentials');
      return structuredClone(account.user);
    },
  };
}
