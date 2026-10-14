import { expect, test } from 'vitest';
import { createMockGameService } from './doubles/gameService';
import type { Rating, Review, User } from '../src/models';

const user: User = { id: 'user-1', username: 'ana', displayName: 'Ana', bio: '', avatarUrl: null };
const review: Review = { id: 'review-1', gameId: 'game-1', userId: user.id, text: 'Review do primeiro jogo.', createdAt: '2026-01-01T00:00:00Z', updatedAt: null };
const ratings: Rating[] = [
  { id: 'rating-1', gameId: 'game-1', userId: 'user-1', value: 0 },
  { id: 'rating-2', gameId: 'game-1', userId: 'user-2', value: 4 },
  { id: 'rating-3', gameId: 'game-2', userId: 'user-3', value: 5 },
];

test('serviço calcula média somente das notas do jogo e filtra suas reviews', async () => {
  const other: Review = { ...review, id: 'review-2', gameId: 'game-2' };
  const service = createMockGameService({ ratings, reviews: [review, other], users: [user] });
  const result = await service.getOpinions('game-1');
  expect(result.averageRating).toBe(2);
  expect(result.reviews).toEqual([{ ...review, author: { id: user.id, displayName: user.displayName, avatarUrl: null } }]);
});

test('zero é média válida e nenhuma nota produz null', async () => {
  const rating: Rating = { id: 'zero', gameId: 'zero', userId: user.id, value: 0 };
  const service = createMockGameService({ ratings: [rating], reviews: [], users: [] });
  await expect(service.getOpinions('zero')).resolves.toEqual({ averageRating: 0, reviews: [] });
  await expect(service.getOpinions('sem-notas')).resolves.toEqual({ averageRating: null, reviews: [] });
});

test('opiniões e autores retornados são isolados das entradas e outras leituras', async () => {
  const seedUser: User = { ...user };
  const seedReview: Review = { ...review };
  const service = createMockGameService({ ratings: [], reviews: [seedReview], users: [seedUser] });
  seedReview.text = 'Alteração externa';
  seedUser.displayName = 'Alteração externa';
  const first = await service.getOpinions('game-1');
  const returned = first.reviews[0];
  if (!returned) throw new Error('Review ausente.');
  returned.text = 'Alteração no retorno';
  returned.author.displayName = 'Alteração no retorno';
  const second = await service.getOpinions('game-1');
  expect(second.reviews[0]?.text).toBe(review.text);
  expect(second.reviews[0]?.author.displayName).toBe('Ana');
});

test('erro de leitura de opiniões pode ser simulado', async () => {
  const error: Error = new Error('Falha simulada de opiniões');
  await expect(createMockGameService({ error }).getOpinions('game-1')).rejects.toBe(error);
});
