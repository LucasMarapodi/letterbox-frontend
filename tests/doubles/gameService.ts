import type { Game, Rating, Review, User } from '../../src/models';
import type { GameOpinions, GamePage, GameQuery, GameService, PublicReview } from '../../src/services/contracts';
import { gameFixtures } from './games';
import { ratingFixtures, reviewFixtures, userFixtures } from './opinions';

export interface MockGameOptions {
  games?: Game[];
  error?: Error;
  ratings?: Rating[];
  reviews?: Review[];
  users?: User[];
}

export function createMockGameService(options: MockGameOptions = {}): GameService {
  const games: Game[] = structuredClone(options.games ?? gameFixtures);
  const error: Error | undefined = options.error;
  const ratings: Rating[] = structuredClone(options.ratings ?? ratingFixtures);
  const reviews: Review[] = structuredClone(options.reviews ?? reviewFixtures);
  const users: User[] = structuredClone(options.users ?? userFixtures);
  return {
    async list(query: GameQuery = {}): Promise<GamePage> {
      if (error) throw error;
      const term: string = (query.term ?? '').trim().toLocaleLowerCase('pt-BR');
      const results: Game[] = games.filter((game) => game.title.toLocaleLowerCase('pt-BR').includes(term));
      if (query.sort) {
        const direction: number = query.sort === 'name-desc' ? -1 : 1;
        results.sort((first, second) => direction * first.title.localeCompare(second.title, 'pt-BR'));
      }
      const page = query.page ?? 1; const pageSize = query.pageSize ?? 20;
      return { items: structuredClone(results.slice((page - 1) * pageSize, page * pageSize)), page, pageSize, hasNextPage: results.length > page * pageSize };
    },
    async getById(id): Promise<Game | null> {
      if (error) throw error;
      const game: Game | undefined = games.find((item) => item.id === id);
      return game ? structuredClone(game) : null;
    },
    async getOpinions(id): Promise<GameOpinions> {
      if (error) throw error;
      const gameRatings: Rating[] = ratings.filter((rating) => rating.gameId === id);
      const averageRating: number | null = gameRatings.length
        ? gameRatings.reduce((total, rating) => total + rating.value, 0) / gameRatings.length
        : null;
      const publicReviews: PublicReview[] = reviews.filter((review) => review.gameId === id).map((review) => {
        const author: User | undefined = users.find((user) => user.id === review.userId);
        return {
          ...review,
          author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null },
        };
      });
      return structuredClone({ averageRating, reviews: publicReviews } satisfies GameOpinions);
    },
  };
}
