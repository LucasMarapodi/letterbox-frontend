import type { CommunityService } from '../communityContracts';
import type { HttpAdapters } from './adapters';
export function createHttpCommunityQueries(getHttp: () => HttpAdapters): Pick<CommunityService, 'getRecentReviews' | 'getMostCommented' | 'getGamesInDiscussion'> {
  return {
    getRecentReviews: () => getHttp().community.recent(),
    getMostCommented: (period) => getHttp().community.mostCommented(period),
    getGamesInDiscussion: (period) => getHttp().community.gamesInDiscussion(period),
  };
}
