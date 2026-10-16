import type { Game } from '../models';
import type { GameService } from '../services/contracts';
import { gameFixtures } from './games';

export interface MockGameOptions {
  games?: Game[];
  error?: Error;
}

export function createMockGameService(options: MockGameOptions = {}): GameService {
  const games: Game[] = structuredClone(options.games ?? gameFixtures);
  const error: Error | undefined = options.error;
  return {
    async list(): Promise<Game[]> {
      if (error) throw error;
      return structuredClone(games);
    },
    async getById(id): Promise<Game | null> {
      if (error) throw error;
      const game: Game | undefined = games.find((item) => item.id === id);
      return game ? structuredClone(game) : null;
    },
  };
}
