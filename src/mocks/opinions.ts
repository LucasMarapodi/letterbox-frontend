import type { Rating, Review, User } from '../models';

/** Opiniões fictícias, independentes de notas e sem dados de pessoas reais. */
export const userFixtures: User[] = [
  { id: 'user-1', username: 'ana', displayName: 'Ana', bio: 'Explorando novos mundos.', avatarUrl: null },
  { id: 'user-2', username: 'leo', displayName: 'Leo', bio: 'Um jogo por vez.', avatarUrl: null },
];
export const ratingFixtures: Rating[] = [
  { id: 'rating-1', gameId: 'game-1', userId: 'user-1', value: 4 },
  { id: 'rating-2', gameId: 'game-1', userId: 'user-2', value: 5 },
  { id: 'rating-3', gameId: 'game-2', userId: 'user-1', value: 0 },
];
export const reviewFixtures: Review[] = [
  { id: 'review-1', gameId: 'game-1', userId: 'user-1', text: 'A exploração convida a seguir cada caminho. A trilha sonora acompanha muito bem a aventura.', createdAt: '2026-01-01T12:00:00Z', updatedAt: null },
  { id: 'review-2', gameId: 'game-1', userId: 'user-2', text: 'Um mundo pequeno, mas cheio de detalhes para descobrir.', createdAt: '2026-01-02T12:00:00Z', updatedAt: null },
];
