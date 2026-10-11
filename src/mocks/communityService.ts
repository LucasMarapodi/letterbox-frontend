import type { CommunityService } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import type { Rating, Review, User, Comment } from '../models';
import { reviewFixtures, ratingFixtures, userFixtures } from './opinions';
import { gameFixtures } from './games';
export function createMockCommunityService(options: { reviews?: Review[]; comments?: Comment[] } = {}): CommunityService {
  const ratings: Rating[] = structuredClone(ratingFixtures);
  const reviews: Review[] = structuredClone(options.reviews ?? reviewFixtures);
  const users: User[] = structuredClone(userFixtures);
  const comments: Comment[] = structuredClone(options.comments ?? [
    { id: 'comment-1', reviewId: 'review-1', userId: 'user-2', text: 'Também gostei de explorar cada caminho.', createdAt: '2026-01-03T12:00:00Z' },
  ]);
  let sequence = 1;
  return {
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
