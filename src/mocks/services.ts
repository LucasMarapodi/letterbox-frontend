import { createMockAuthService } from './authService';
import { createMockCommunityService } from './communityService';
import type { AuthService } from '../services/authContracts';
import type { CommunityService } from '../services/communityContracts';

export function createMockServices(): { auth: AuthService; community: CommunityService } {
  return { auth: createMockAuthService(), community: createMockCommunityService() };
}
export const mockServices = createMockServices();
