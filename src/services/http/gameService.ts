import type { GameService } from '../contracts';
import type { HttpAdapters } from './adapters';
import { HttpFailure } from './client';
export function createHttpGameService(getHttp: () => HttpAdapters): GameService {
  return {
    getFilters: () => getHttp().games.filters(),
    list: (query) => getHttp().games.list(query),
    async getById(id) {
      try { return await getHttp().games.get(id); }
      catch (error: unknown) { if (error instanceof HttpFailure && error.kind === 'http' && error.status === 404) return null; throw error; }
    },
    getOpinions: (id) => getHttp().games.opinions(id),
  };
}
