import { createMockAuthService } from './authService';
import { createMockCommunityService } from './communityService';
import type { AuthService } from '../../src/services/authContracts';
import type { CommunityService } from '../../src/services/communityContracts';
import { userFixtures } from './opinions';
import type { MockUserStore, MockSessionStore } from './userStore';

export function createMockServices(): { auth: AuthService; community: CommunityService } {
  const userStore: MockUserStore = { users: structuredClone(userFixtures) };
  const sessionStore: MockSessionStore = { user: null };
  return { auth: createMockAuthService({ userStore, sessionStore }), community: createMockCommunityService({ userStore, sessionStore }) };
}
export const mockServices = createMockServices();
