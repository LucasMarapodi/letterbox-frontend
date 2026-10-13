import type { AuthService } from '../authContracts';
import { AuthError } from '../authContracts';
import { HttpFailure } from './client';
import type { HttpAdapters } from './adapters';
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
