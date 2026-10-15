import type { PublicUserResponse, GameResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, NotificationResponse } from '../src/services/http/dtos';
import type { FetchTransport } from '../src/services/http/client';
import type { GamePageResponse } from '../src/services/http/dtos';
export function wirePage(items: GameResponse[] = []): GamePageResponse { return { items, page: 1, pageSize: 20, hasNextPage: false }; }
/** Isola casos de autenticação do catálogo público migrado em outra PR. */
export function withCatalog(transport: FetchTransport): FetchTransport {
  return (url, init) => new URL(url).pathname === '/api/v1/games' ? Promise.resolve(Response.json(wirePage())) : url.endsWith('/dashboard') ? Promise.resolve(Response.json({favorites:{games:[],reviews:[]},feed:[]})) : transport(url, init);
}
export function withAuthentication(transport: FetchTransport, options: { isolateDashboard?: boolean } = {}): FetchTransport {
  return (url, init) => url.endsWith('/auth/login') ? Promise.resolve(Response.json({ user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' })) : url.endsWith('/auth/me') ? Promise.resolve(Response.json(wireUser)) : url.endsWith('/dashboard') && options.isolateDashboard !== false ? Promise.resolve(Response.json({favorites:{games:[],reviews:[]},feed:[]})) : transport(url, init);
}
export const wireUser: PublicUserResponse = { id: 1, username: 'ana', displayName: 'Ana', bio: '', avatarUrl: null };
export const wireGame: GameResponse = { id: 12, igdbId: 345447, title: 'Jogo HTTP', summary: '', coverUrl: null, genres: ['RPG'], platforms: ['PC'], releaseDate: '2024-02-29', averageRating: 4.5 };
export const wireReview: ReviewResponse = { id: 'r/1', userId: wireUser.id, gameId: wireGame.id, text: 'Review', createdAt: '2026-10-13T12:30:00+00:00', updatedAt: null, author: { id: wireUser.id, displayName: wireUser.displayName, avatarUrl: null }, game: { id: wireGame.id, title: wireGame.title, coverUrl: null } };
export const wireComment: CommentResponse = { id: 'c', userId: wireUser.id, reviewId: wireReview.id, text: 'Comentário', createdAt: wireReview.createdAt, author: wireReview.author };
export const wireRating: RatingResponse = { id: 'rating', userId: wireUser.id, gameId: wireGame.id, value: 0 };
export const wireFavorite: FavoriteResponse = { id: 'f', userId: wireUser.id, targetType: 'game', targetId: wireGame.id };
export const wireNotification: NotificationResponse = { id: 'n', userId: 2, actorId: wireUser.id, reviewId: wireReview.id, createdAt: wireReview.createdAt, actor: wireReview.author, type: 'new-review' };
