import type { CommunityService } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import type { Rating, Review, User, Comment, Favorite } from '../models';
import { reviewFixtures, ratingFixtures, userFixtures } from './opinions';
import { gameFixtures } from './games';
import type { MockUserStore } from './userStore';
export function createMockCommunityService(options: { reviews?: Review[]; comments?: Comment[]; users?: User[]; userStore?: MockUserStore } = {}): CommunityService {
  const ratings: Rating[] = structuredClone(ratingFixtures);
  const reviews: Review[] = structuredClone(options.reviews ?? reviewFixtures);
  const users: User[] = options.userStore?.users ?? structuredClone(options.users ?? userFixtures);
  const comments: Comment[] = structuredClone(options.comments ?? [
    { id: 'comment-1', reviewId: 'review-1', userId: 'user-2', text: 'Também gostei de explorar cada caminho.', createdAt: '2026-01-03T12:00:00Z' },
  ]);
  let sequence = 1;
  const favorites: Favorite[] = [];
  return {
    async getFavorites(user) {
      if (!user) throw new CommunityError('session-required');
      const own = favorites.filter((favorite) => favorite.userId === user.id);
      const games = gameFixtures.filter((game) => own.some((favorite) => favorite.targetType === 'game' && favorite.targetId === game.id));
      const savedReviews = reviews.filter((review) => own.some((favorite) => favorite.targetType === 'review' && favorite.targetId === review.id)).map((review) => {
        const author = users.find((item) => item.id === review.userId);
        const game = gameFixtures.find((item) => item.id === review.gameId);
        return { ...review, author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null }, game: { id: review.gameId, title: game?.title ?? 'Jogo indisponível' } };
      });
      return structuredClone({ games, reviews: savedReviews });
    },
    async getFavorite(kind, targetId, user) {
      if (!user) throw new CommunityError('session-required');
      return structuredClone(favorites.find((favorite) => favorite.userId === user.id && favorite.targetType === kind && favorite.targetId === targetId) ?? null);
    },
    async setFavorite(kind, targetId, selected, user) {
      if (!user) throw new CommunityError('session-required');
      const exists = kind === 'game' ? gameFixtures.some((game) => game.id === targetId) : reviews.some((review) => review.id === targetId);
      if (!exists) throw new CommunityError('not-found');
      const index = favorites.findIndex((favorite) => favorite.userId === user.id && favorite.targetType === kind && favorite.targetId === targetId);
      if (!selected) { if (index >= 0) favorites.splice(index, 1); return null; }
      if (index >= 0) return structuredClone(favorites[index]);
      const favorite: Favorite = { id: `mock-favorite-${sequence++}`, userId: user.id, targetType: kind, targetId };
      favorites.push(favorite);
      return structuredClone(favorite);
    },
    async getProfile(id, sessionUser = null) {
      if (sessionUser?.id === id && !users.some((item) => item.id === id)) users.push(structuredClone(sessionUser));
      const user = users.find((item) => item.id === id);
      if (!user) return null;
      return structuredClone({ user, reviews: reviews.filter((review) => review.userId === id).map((review) => {
        const game = gameFixtures.find((item) => item.id === review.gameId);
        return { ...review, author: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl }, game: { id: review.gameId, title: game?.title ?? 'Jogo indisponível' } };
      }) });
    },
    async getRating(gameId, user) {
      if (!user) throw new CommunityError('session-required');
      return structuredClone(ratings.find((rating) => rating.gameId === gameId && rating.userId === user.id) ?? null);
    },
    async comment(reviewId, text, user) {
      if (!user) throw new CommunityError('session-required');
      if (!reviews.some((review) => review.id === reviewId)) throw new CommunityError('not-found');
      if (!text.trim()) throw new CommunityError('empty-text');
      while (comments.some((comment) => comment.id === `mock-comment-${sequence}`)) sequence++;
      const comment: Comment = { id: `mock-comment-${sequence++}`, reviewId, userId: user.id, text: text.trim(), createdAt: new Date().toISOString() };
      comments.push(comment);
      if (!users.some((item) => item.id === user.id)) users.push(structuredClone(user));
      return structuredClone(comment);
    },
    async getComments(reviewId) {
      return structuredClone(comments.filter((comment) => comment.reviewId === reviewId).map((comment) => {
        const author = users.find((item) => item.id === comment.userId);
        return { ...comment, author: { id: comment.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null } };
      }));
    },
    async editReview(id, text, user) {
      if (!user) throw new CommunityError('session-required');
      const review = reviews.find((item) => item.id === id);
      if (!review) throw new CommunityError('not-found');
      if (review.userId !== user.id) throw new CommunityError('forbidden');
      if (!text.trim()) throw new CommunityError('empty-text');
      review.text = text.trim();
      review.updatedAt = new Date().toISOString();
      return structuredClone(review);
    },
    async getReview(id) {
      const review = reviews.find((item) => item.id === id);
      if (!review) return null;
      const author = users.find((item) => item.id === review.userId);
      const game = gameFixtures.find((item) => item.id === review.gameId);
      return structuredClone({ ...review, author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null }, game: { id: review.gameId, title: game?.title ?? 'Jogo indisponível' } });
    },
    async publish(gameId, text, user) {
      if (!user) throw new CommunityError('session-required');
      if (!text.trim()) throw new CommunityError('empty-text');
      if (reviews.some((review) => review.gameId === gameId && review.userId === user.id)) throw new CommunityError('duplicate-review');
      while (reviews.some((review) => review.id === `mock-review-${sequence}`)) sequence++;
      const review: Review = { id: `mock-review-${sequence++}`, gameId, userId: user.id, text: text.trim(), createdAt: new Date().toISOString(), updatedAt: null };
      reviews.push(review);
      if (!users.some((item) => item.id === user.id)) users.push(structuredClone(user));
      return structuredClone(review);
    },
    async findOwnReview(gameId, user) { return structuredClone(reviews.find((review) => review.gameId === gameId && review.userId === user.id) ?? null); },
    async getOpinions(gameId) {
      const notes = ratings.filter((rating) => rating.gameId === gameId);
      return structuredClone({ averageRating: notes.length ? notes.reduce((sum, note) => sum + note.value, 0) / notes.length : null,
        reviews: reviews.filter((review) => review.gameId === gameId).map((review) => { const author = users.find((item) => item.id === review.userId); return { ...review, author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null } }; }) });
    },
    async rate(gameId, value, user) {
    if (!user) throw new CommunityError('session-required');
    if (!Number.isFinite(value) || value < 0 || value > 5) throw new CommunityError('invalid-rating');
    let rating = ratings.find((item) => item.gameId === gameId && item.userId === user.id);
    if (rating) rating.value = value;
    else { rating = { id: `mock-rating-${ratings.length + 1}`, gameId, userId: user.id, value }; ratings.push(rating); }
    return structuredClone(rating);
  } };
}
