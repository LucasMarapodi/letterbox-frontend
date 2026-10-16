import type { Rating, Review, User } from '../../src/models';

/** Opiniões fictícias, independentes de notas e sem dados de pessoas reais. */
export const userFixtures: User[] = [
  { id: 1, username: 'ana', displayName: 'Ana', bio: 'Explorando novos mundos.', avatarUrl: null },
  { id: 2, username: 'leo', displayName: 'Leo', bio: 'Um jogo por vez.', avatarUrl: null },
];
export const ratingFixtures: Rating[] = [
  { id: 1, gameId: 1, userId: 1, value: 4 },
  { id: 2, gameId: 1, userId: 2, value: 5 },
  { id: 3, gameId: 2, userId: 1, value: 0 },
];
export const reviewFixtures: Review[] = [
  { id: 1, gameId: 1, userId: 1, rating: 4, text: 'A exploração convida a seguir cada caminho. A trilha sonora acompanha muito bem a aventura.', createdAt: '2026-01-01T12:00:00Z', updatedAt: null },
  { id: 2, gameId: 1, userId: 2, rating: 5, text: 'Um mundo pequeno, mas cheio de detalhes para descobrir.', createdAt: '2026-01-02T12:00:00Z', updatedAt: null },
];
