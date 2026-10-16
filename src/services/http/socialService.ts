import type { CommunityService } from '../communityContracts';
import type { HttpAdapters } from './adapters';
import { communityRequest } from './opinionService';
export function createHttpFollowService(getHttp: () => HttpAdapters): Pick<CommunityService, 'isFollowing' | 'setFollowing'> {
  return {
    isFollowing: (id) => communityRequest(() => getHttp().social.isFollowing(id)),
    setFollowing: (id, selected) => communityRequest(() => getHttp().social.setFollowing(id, selected)),
  };
}
export function createHttpFavoriteService(getHttp: () => HttpAdapters): Pick<CommunityService, 'getFavorites' | 'getFavorite' | 'setFavorite'> {
  return {
    getFavorites: () => communityRequest(() => getHttp().social.favorites()),
    getFavorite: (kind, id) => communityRequest(() => getHttp().social.favorite(kind, id)),
    setFavorite: (kind, id, selected) => communityRequest(() => getHttp().social.setFavorite(kind, id, selected)),
  };
}
