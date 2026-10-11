import type { Game, Id } from '../models';

/** Fronteira provisória; ampliar operações apenas nas US correspondentes. */
export type GameSort = 'name-asc' | 'name-desc';
export interface GameQuery { term?: string; sort?: GameSort; }

export interface GameService {
  list(query?: GameQuery): Promise<Game[]>;
  getById(id: Id): Promise<Game | null>;
}

export interface Services {
  games: GameService;
}
