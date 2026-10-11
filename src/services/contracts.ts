import type { Game, Id } from '../models';

/** Fronteira provisória; ampliar operações apenas nas US correspondentes. */
export interface GameQuery { term?: string; }

export interface GameService {
  list(query?: GameQuery): Promise<Game[]>;
  getById(id: Id): Promise<Game | null>;
}

export interface Services {
  games: GameService;
}
