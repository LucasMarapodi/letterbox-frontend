import type { CommunityService } from '../communityContracts';
import type { HttpAdapters } from './adapters';
import { HttpFailure } from './client';
export function createHttpProfileService(getHttp: () => HttpAdapters): Pick<CommunityService, 'getProfile' | 'getConnections'> {
  return {
    async getProfile(id) {
      const http = getHttp();
      let user;
      try { user = await http.profiles.get(id); }
      catch (error: unknown) { if (error instanceof HttpFailure && error.kind === 'http' && error.status === 404) return null; throw error; }
      return { user, reviews: await http.profiles.reviews(id) };
    },
    getConnections: (id) => getHttp().profiles.connections(id),
  };
}
