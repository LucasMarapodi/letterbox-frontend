import { createMockAuthService } from './authService';
import { createMockCommunityService } from './communityService';
import type { AuthService } from '../services/authContracts';
import type { CommunityService } from '../services/communityContracts';
import { userFixtures } from './opinions';
import type { MockUserStore } from './userStore';

export function createMockServices(): { auth: AuthService; community: CommunityService } {
  const userStore: MockUserStore = { users: structuredClone(userFixtures) };
  return { auth: createMockAuthService({ userStore }), community: createMockCommunityService({ userStore }) };
}
export const mockServices = createMockServices();
