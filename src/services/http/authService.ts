import type { AuthService } from '../authContracts';
import { AuthError } from '../authContracts';
import { HttpFailure } from './client';
import type { HttpAdapters, HttpSessionStore } from './adapters';
import type { User } from '../../models';
import type { LoginResponse } from './dtos';
export function createHttpRegistration(getAdapters: () => HttpAdapters): AuthService['register'] {
  return async (input) => {
    try { return await getAdapters().auth.register(input); }
    catch (error: unknown) {
      if (error instanceof HttpFailure && error.status === 503 && error.code === 'storage_unavailable') throw new AuthError('storage-unavailable');
      if (error instanceof HttpFailure && error.status === 400) throw new AuthError('invalid-fields');
      if (error instanceof HttpFailure && error.status === 409) throw new AuthError('duplicate-email');
      throw error;
    }
  };
}
export function createHttpAuthService(getAdapters: () => HttpAdapters, session: HttpSessionStore): AuthService {
  let sequence = 0;
  let controller: AbortController | null = null;
  let confirmedUser: User | null = null;
  let confirmedVersion = -1;
  const listeners = new Set<() => void>();
  function notify(): void { for (const listener of listeners) listener(); }
  session.subscribe(() => { confirmedUser = session.version() === confirmedVersion ? session.current()?.user ?? null : null; notify(); });
  return {
    sessionUser() { return confirmedUser ? structuredClone(confirmedUser) : null; },
    sessionVersion: () => session.version(),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    register: createHttpRegistration(getAdapters),
    async editProfile(input) {
      const version = session.version();
      if (!confirmedUser || version !== confirmedVersion) throw new HttpFailure('http', 401, 'unauthorized');
      let user: User;
      try { user = await getAdapters().profiles.edit(input); }
      catch (error: unknown) {
        if (error instanceof HttpFailure && error.status === 503 && error.code === 'storage_unavailable') throw new AuthError('storage-unavailable');
        if (error instanceof HttpFailure && error.kind === 'http' && error.status === 400) throw new AuthError('invalid-fields');
        throw error;
      }
      if (session.version() !== version) throw new HttpFailure('cancelled');
      session.updateUser(user);
      return user;
    },
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
        confirmedUser = user; confirmedVersion = session.version(); notify();
        return user;
      } catch (error: unknown) {
        if (attempt !== sequence) throw new HttpFailure('cancelled');
        if (http.session.version() === ownedVersion) http.session.clear();
        if (error instanceof HttpFailure && error.status === 503 && error.code === 'storage_unavailable') throw new AuthError('storage-unavailable');
        throw error;
      } finally { if (attempt === sequence) controller = null; }
    },
    async logout() { sequence++; controller?.abort(); controller = null; await getAdapters().auth.logout(); },
  };
}
