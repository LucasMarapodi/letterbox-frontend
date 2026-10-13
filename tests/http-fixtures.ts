import type { PublicUserResponse, GameResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, NotificationResponse } from '../src/services/http/dtos';
export const wireUser: PublicUserResponse = { id: 'u%2F1', username: 'ana', displayName: 'Ana', bio: '', avatarUrl: null };
export const wireGame: GameResponse = { id: 'game%2F42', title: 'Jogo HTTP', summary: '', coverUrl: null, genres: ['RPG'], platforms: ['PC'], releaseDate: '2024-02-29', averageRating: 4.5 };
export const wireReview: ReviewResponse = { id: 'r/1', userId: wireUser.id, gameId: wireGame.id, text: 'Review', createdAt: '2026-10-13T12:30:00+00:00', updatedAt: null, author: { id: wireUser.id, displayName: wireUser.displayName, avatarUrl: null }, game: { id: wireGame.id, title: wireGame.title, coverUrl: null } };
export const wireComment: CommentResponse = { id: 'c', userId: wireUser.id, reviewId: wireReview.id, text: 'Comentário', createdAt: wireReview.createdAt, author: wireReview.author };
export const wireRating: RatingResponse = { id: 'rating', userId: wireUser.id, gameId: wireGame.id, value: 0 };
export const wireFavorite: FavoriteResponse = { id: 'f', userId: wireUser.id, targetType: 'game', targetId: wireGame.id };
export const wireNotification: NotificationResponse = { id: 'n', userId: 'recipient', actorId: wireUser.id, reviewId: wireReview.id, createdAt: wireReview.createdAt, actor: wireReview.author, type: 'new-review' };
