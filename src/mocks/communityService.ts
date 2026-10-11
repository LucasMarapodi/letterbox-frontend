import type { CommunityService } from '../services/communityContracts';
export function createMockCommunityService(): CommunityService {
  return { async rate() { throw new Error('Avaliação não implementada.'); } };
}
