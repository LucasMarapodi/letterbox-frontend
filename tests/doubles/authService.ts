import type { User } from '../../src/models';
import type { AuthService } from '../../src/services/authContracts';
import { AuthError } from '../../src/services/authContracts';
import { accountFixtures } from './accounts';
import type { MockUserStore, MockSessionStore } from './userStore';

export interface MockAccount { email: string; password: string; user: User; }
export interface MockAuthOptions { accounts?: MockAccount[]; error?: Error; userStore?: MockUserStore; sessionStore?: MockSessionStore; }
export function createMockAuthService(options: MockAuthOptions = {}): AuthService {
  const accounts: MockAccount[] = structuredClone(options.accounts ?? accountFixtures);
  let sequence = 1;
  return {
    logout() { if (options.sessionStore) options.sessionStore.user = null; },
    async register(input): Promise<User> {
      if (options.error) throw options.error;
      const email = input.email.trim().toLowerCase();
      if (accounts.some((account) => account.email.trim().toLowerCase() === email)) throw new AuthError('duplicate-email');
      while (accounts.some((account) => account.user.id === sequence) || options.userStore?.users.some((user) => user.id === sequence)) sequence++;
      const id = sequence++;
      const user: User = { id, username: `user-${id}`, displayName: input.name.trim(), avatarUrl: null, bio: '' };
      accounts.push({ email, password: input.password, user });
      options.userStore?.users.push(structuredClone(user));
      return structuredClone(user);
    },
    async login(credentials): Promise<User> {
      if (options.error) throw options.error;
      const email: string = credentials.email.trim().toLowerCase();
      const account: MockAccount | undefined = accounts.find((candidate) => candidate.email.trim().toLowerCase() === email && candidate.password === credentials.password);
      if (!account) throw new AuthError('invalid-credentials');
      if (options.sessionStore) options.sessionStore.user = structuredClone(account.user);
      return structuredClone(account.user);
    },
  };
}
