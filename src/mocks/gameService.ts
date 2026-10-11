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
      const results: Game[] = games.filter((game) => game.title.toLocaleLowerCase('pt-BR').includes(term));
      if (query.sort) {
        const direction: number = query.sort === 'name-desc' ? -1 : 1;
        results.sort((first, second) => direction * first.title.localeCompare(second.title, 'pt-BR'));
      }
      return structuredClone(results);
    },
    async getById(id): Promise<Game | null> {
      if (error) throw error;
      const game: Game | undefined = games.find((item) => item.id === id);
      return game ? structuredClone(game) : null;
    },
  };
}
