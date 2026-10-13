import { expect, test } from 'vitest';
import { decodeUser, decodeGame, decodeReview, decodeComment, decodeRating, decodeFavorite, decodeNotification, decodeLogin, decodeDashboard, decodeOpinions, decodeFavoriteLists, decodeRankedReview, decodeRankedGame, unwrapRating, unwrapReview, unwrapFavorite, unwrapFollowing, decodeList, composeProfile, composeConnections } from '../src/services/http/decoders';
import { wireUser, wireGame, wireReview, wireComment, wireRating, wireFavorite, wireNotification } from './http-fixtures';
test('objetos do contrato C# preservam IDs, null, decimal e data sem hora', () => {
  expect(decodeUser(wireUser)).toEqual(wireUser); expect(decodeGame(wireGame)).toEqual(wireGame);
  expect(decodeReview(wireReview)).toEqual(wireReview); expect(decodeComment(wireComment)).toEqual(wireComment);
  expect(decodeRating(wireRating)).toEqual(wireRating); expect(decodeFavorite(wireFavorite)).toEqual(wireFavorite);
  expect(decodeGame({ ...wireGame, averageRating: null, releaseDate: null }).averageRating).toBeNull();
  expect(decodeGame({ ...wireGame, averageRating: 0 }).averageRating).toBe(0);
});
test('wrappers pessoais são desembrulhados com null explícito', () => {
  expect(unwrapRating({ rating: wireRating })).toEqual(wireRating); expect(unwrapRating({ rating: null })).toBeNull();
  expect(unwrapReview({ review: wireReview })).toEqual(wireReview); expect(unwrapReview({ review: null })).toBeNull();
  expect(unwrapFavorite({ favorite: wireFavorite })).toEqual(wireFavorite); expect(unwrapFavorite({ favorite: null })).toBeNull();
  expect(unwrapFollowing({ following: false })).toBe(false); expect(unwrapFollowing({ following: true })).toBe(true);
  for (const decode of [unwrapRating, unwrapReview, unwrapFavorite, unwrapFollowing]) expect(() => decode({})).toThrow();
});
test('login mantém token separado do usuário e projeções públicas excluem segredos', () => {
  const response = decodeLogin({ user: wireUser, token: 'test-only', expiresAt: wireReview.createdAt });
  expect(response.user).toEqual(wireUser); expect(response.user).not.toHaveProperty('token');
  for (const field of ['password','passwordHash','token','email']) expect(() => decodeUser({ ...wireUser, [field]: 'test-only' })).toThrow();
  expect(() => decodeLogin({ user: wireUser, token: '', expiresAt: 'invalid' })).toThrow();
});
test('união discriminada de eventos não introduz read e exige commentId somente no evento correto', () => {
  expect(decodeNotification(wireNotification)).toEqual(wireNotification);
  expect(decodeNotification({ ...wireNotification, type: 'review-comment', commentId: 'c' })).toMatchObject({ type: 'review-comment', commentId: 'c' });
  expect(decodeNotification(wireNotification)).not.toHaveProperty('read');
  for (const malformed of [{ ...wireNotification, type: 'unknown' }, { ...wireNotification, type: 'review-comment' }, { ...wireNotification, commentId: 'c' }, { ...wireNotification, type: 'review-comment', commentId: null }]) expect(() => decodeNotification(malformed)).toThrow();
});
test('compõe perfil conexões favoritos dashboard opiniões e rankings validados', () => {
  const lists = { games: [wireGame], reviews: [wireReview] };
  expect(composeProfile(wireUser, [wireReview])).toEqual({ user: wireUser, reviews: [wireReview] });
  expect(composeConnections([wireUser], [])).toEqual({ followers: [wireUser], following: [] });
  expect(decodeFavoriteLists(lists)).toEqual(lists);
  expect(decodeDashboard({ favorites: lists, feed: [wireReview] })).toEqual({ favorites: lists, feed: [wireReview] });
  expect(decodeOpinions({ averageRating: null, reviews: [] })).toEqual({ averageRating: null, reviews: [] });
  expect(decodeOpinions({ averageRating: 0, reviews: [wireReview] }).averageRating).toBe(0);
  expect(decodeRankedReview({ review: wireReview, commentCount: 2, lastCommentAt: wireReview.createdAt }).commentCount).toBe(2);
  expect(decodeRankedGame({ game: wireGame, commentCount: 1, lastCommentAt: wireReview.createdAt }).game.id).toBe(wireGame.id);
  expect(decodeList([wireUser], decodeUser)).toEqual([wireUser]); expect(() => decodeList({}, decodeUser)).toThrow();
});
test('campos ausentes tipos errados datas impossíveis e números inválidos são rejeitados', () => {
  for (const invalid of [null, {}, { ...wireUser, id: 42 }, { ...wireUser, avatarUrl: undefined }]) expect(() => decodeUser(invalid)).toThrow();
  for (const invalid of [{ ...wireGame, genres: [42] }, { ...wireGame, averageRating: '0' }, { ...wireGame, averageRating: 6 }, { ...wireGame, releaseDate: '2023-02-29' }, { ...wireGame, releaseDate: '2024-01-01T00:00:00Z' }]) expect(() => decodeGame(invalid)).toThrow();
  for (const invalid of [{ ...wireReview, createdAt: 'yesterday' }, { ...wireReview, createdAt: '2026-02-30T12:00:00Z' }, { ...wireReview, author: null }, { ...wireReview, updatedAt: false }]) expect(() => decodeReview(invalid)).toThrow();
  expect(() => decodeRating({ ...wireRating, value: NaN })).toThrow(); expect(() => decodeFavorite({ ...wireFavorite, targetType: 'user' })).toThrow();
  expect(() => decodeRankedGame({ game: wireGame, commentCount: 1.5, lastCommentAt: wireReview.createdAt })).toThrow();
  expect(() => decodeDashboard({ favorites: { games: [], reviews: [null] }, feed: [] })).toThrow();
});
test('instantes não aceitam 24 horas normalizadas silenciosamente para o dia seguinte', () => {
  expect(() => decodeReview({ ...wireReview, createdAt: '2026-10-13T24:00:00Z' })).toThrow();
});
