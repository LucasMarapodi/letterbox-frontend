import type { Game, Id, Review, User } from '../models';

/** Fronteira provisória; ampliar operações apenas nas US correspondentes. */
export type GameSort = 'name-asc' | 'name-desc';
export interface GameQuery { term?: string; sort?: GameSort; }

export interface PublicReview extends Review {
  author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}
export interface GameOpinions { averageRating: number | null; reviews: PublicReview[]; }

export interface GameService {
  list(query?: GameQuery): Promise<Game[]>;
  getById(id: Id): Promise<Game | null>;
  getOpinions(id: Id): Promise<GameOpinions>;
}

export interface Services {
  games: GameService;
}
