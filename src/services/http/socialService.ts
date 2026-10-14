import type { CommunityService } from '../communityContracts';
import type { HttpAdapters } from './adapters';
import { communityRequest } from './opinionService';
export function createHttpFollowService(getHttp: () => HttpAdapters): Pick<CommunityService, 'isFollowing' | 'setFollowing'> {
  return {
    isFollowing: (id) => communityRequest(() => getHttp().social.isFollowing(id)),
    setFollowing: (id, selected) => communityRequest(() => getHttp().social.setFollowing(id, selected)),
  };
}
