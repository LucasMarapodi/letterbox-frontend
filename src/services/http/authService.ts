import type { AuthService } from '../authContracts';
import { AuthError } from '../authContracts';
import { HttpFailure } from './client';
import type { HttpAdapters } from './adapters';
import type { LoginResponse } from './dtos';
export function createHttpRegistration(getAdapters: () => HttpAdapters): AuthService['register'] {
  return async (input) => {
    try { return await getAdapters().auth.register(input); }
    catch (error: unknown) {
      if (error instanceof HttpFailure && error.status === 400) throw new AuthError('invalid-fields');
      if (error instanceof HttpFailure && error.status === 409) throw new AuthError('duplicate-email');
      throw error;
    }
  };
}
export function createHttpAuthService(getAdapters: () => HttpAdapters): AuthService {
  let sequence = 0;
  let controller: AbortController | null = null;
  return {
    register: createHttpRegistration(getAdapters),
    async login(credentials) {
      const http = getAdapters();
      const attempt = ++sequence;
      controller?.abort();
      const request = new AbortController(); controller = request;
      http.session.clear();
      let ownedVersion = http.session.version();
      try {
        let result: LoginResponse;
        try { result = await http.auth.login(credentials, request.signal); }
        catch (error: unknown) {
          if (error instanceof HttpFailure && error.status === 401) throw new AuthError('invalid-credentials');
          if (error instanceof HttpFailure && error.status === 400) throw new AuthError('invalid-fields');
          throw error;
        }
        if (attempt !== sequence || http.session.version() !== ownedVersion) throw new HttpFailure('cancelled');
        http.session.establish(result); ownedVersion = http.session.version();
        const user = await http.auth.me(request.signal);
        if (attempt !== sequence || http.session.version() !== ownedVersion) throw new HttpFailure('cancelled');
        if (user.id !== result.user.id) throw new HttpFailure('contract');
        http.session.establish({ ...result, user });
        return user;
      } catch (error: unknown) {
        if (attempt !== sequence) throw new HttpFailure('cancelled');
        if (http.session.version() === ownedVersion) http.session.clear();
        throw error;
      } finally { if (attempt === sequence) controller = null; }
    },
    logout() { sequence++; controller?.abort(); controller = null; getAdapters().session.clear(); },
  };
}
