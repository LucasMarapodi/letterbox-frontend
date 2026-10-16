import type { Game, GameId, Review, User } from '../models';

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
  getById(id: GameId): Promise<Game | null>;
  getOpinions(id: GameId): Promise<GameOpinions>;
}

export interface Services {
  games: GameService;
}
