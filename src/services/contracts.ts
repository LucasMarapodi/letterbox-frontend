import type { Game, Id, Review, User } from '../models';

/** Fronteira provisória; ampliar operações apenas nas US correspondentes. */
export type GameSort = 'release-desc' | 'name-asc' | 'name-desc';
export interface GameQuery { term?: string; sort?: GameSort; page?: number; pageSize?: number; }
export interface GamePage { items: Game[]; page: number; pageSize: number; hasNextPage: boolean; }

export interface PublicReview extends Review {
  author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}
export interface GameOpinions { averageRating: number | null; reviews: PublicReview[]; }

export interface GameService {
  list(query?: GameQuery): Promise<GamePage>;
  getById(id: Id): Promise<Game | null>;
  getOpinions(id: Id): Promise<GameOpinions>;
}

export interface Services {
  games: GameService;
}
