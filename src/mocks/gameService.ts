import type { Game } from '../models';
import type { GameQuery, GameService } from '../services/contracts';
import { gameFixtures } from './games';

export interface MockGameOptions {
  games?: Game[];
  error?: Error;
}

export function createMockGameService(options: MockGameOptions = {}): GameService {
  const games: Game[] = structuredClone(options.games ?? gameFixtures);
  const error: Error | undefined = options.error;
  return {
    async list(query: GameQuery = {}): Promise<Game[]> {
      if (error) throw error;
      const term: string = (query.term ?? '').trim().toLocaleLowerCase('pt-BR');
      return structuredClone(games.filter((game) => game.title.toLocaleLowerCase('pt-BR').includes(term)));
    },
    async getById(id): Promise<Game | null> {
      if (error) throw error;
      const game: Game | undefined = games.find((item) => item.id === id);
      return game ? structuredClone(game) : null;
    },
  };
}
