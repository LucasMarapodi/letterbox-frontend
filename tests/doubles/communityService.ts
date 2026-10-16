import type { CommunityService, ReviewDetails } from '../../src/services/communityContracts';
import { CommunityError } from '../../src/services/communityContracts';
import type { Rating, Review, User, Comment, Favorite } from '../../src/models';
import { reviewFixtures, ratingFixtures, userFixtures } from './opinions';
import { gameFixtures } from './games';
import type { MockUserStore, MockSessionStore } from './userStore';
import { commentsInPeriod } from './commentWindow';
export function createMockCommunityService(options: { reviews?: Review[]; comments?: Comment[]; users?: User[]; userStore?: MockUserStore; sessionStore?: MockSessionStore; clock?: () => Date } = {}): CommunityService {
  const ratings: Rating[] = structuredClone(ratingFixtures);
  const reviews: Review[] = structuredClone(options.reviews ?? reviewFixtures);
  const users: User[] = options.userStore?.users ?? structuredClone(options.users ?? userFixtures);
  const comments: Comment[] = structuredClone(options.comments ?? [
    { id: 1, reviewId: 1, parentCommentId: null, likeCount: 0, userId: 2, text: 'Também gostei de explorar cada caminho.', createdAt: '2026-01-03T12:00:00Z' },
  ]);
  let sequence = 1;
  const favorites: Favorite[] = [];
  const follows: { followerId: number; followedId: number }[] = [];
  function reviewDetails(review: Review): ReviewDetails {
    const author = users.find((item) => item.id === review.userId);
    const game = gameFixtures.find((item) => item.id === review.gameId);
    return { ...review, author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null }, game: { id: review.gameId, title: game?.title ?? 'Jogo indisponível' } };
  }
  return {
    async getGameReviews(id) { return structuredClone(reviews.filter((review) => review.gameId === id).map(reviewDetails)); },
    async getGamesInDiscussion(period) {
      const eligible = commentsInPeriod(comments, period, options.clock ?? (() => new Date()));
      const gameByReview = new Map(reviews.map((review) => [review.id, review.gameId]));
      return structuredClone(gameFixtures.map((game) => {
        const activity = eligible.filter((comment) => gameByReview.get(comment.reviewId) === game.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return { game, commentCount: activity.length, lastCommentAt: activity[0]?.createdAt ?? '' };
      }).filter((item) => item.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount || Date.parse(b.lastCommentAt) - Date.parse(a.lastCommentAt) || (a.game.id - b.game.id)));
    },
    async getMostCommented(period) {
      const eligible = commentsInPeriod(comments, period, options.clock ?? (() => new Date()));
      return structuredClone(reviews.map((review) => {
        const activity = eligible.filter((comment) => comment.reviewId === review.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return { review: reviewDetails(review), commentCount: activity.length, lastCommentAt: activity[0]?.createdAt ?? '' };
      }).filter((item) => item.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount || Date.parse(b.lastCommentAt) - Date.parse(a.lastCommentAt) || (a.review.id - b.review.id)));
    },
    async getRecentReviews() {
      return structuredClone([...reviews].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || (left.id - right.id)).map(reviewDetails));
    },
    async getFeed(user) {
      if (!user) throw new CommunityError('session-required');
      const followed = new Set(follows.filter((relation) => relation.followerId === user.id).map((relation) => relation.followedId));
      return structuredClone(reviews.filter((review) => followed.has(review.userId))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || (left.id - right.id))
        .map((review) => {
          const author = users.find((item) => item.id === review.userId);
          const game = gameFixtures.find((item) => item.id === review.gameId);
          return { ...review, author: { id: review.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null }, game: { id: review.gameId, title: game?.title ?? 'Jogo indisponível' } };
        }));
    },
    async getConnections(profileId) {
      return structuredClone({
        followers: users.filter((user) => follows.some((relation) => relation.followerId === user.id && relation.followedId === profileId)),
        following: users.filter((user) => follows.some((relation) => relation.followerId === profileId && relation.followedId === user.id)),
      });
    },
    async isFollowing(targetId, user) {
      if (!user) throw new CommunityError('session-required');
      return follows.some((relation) => relation.followerId === user.id && relation.followedId === targetId);
    },
    async setFollowing(targetId, selected, user) {
      if (!user) throw new CommunityError('session-required');
      if (targetId === user.id) throw new CommunityError('self-follow');
      if (!users.some((item) => item.id === targetId)) throw new CommunityError('not-found');
      const index = follows.findIndex((relation) => relation.followerId === user.id && relation.followedId === targetId);
      if (!selected) { if (index >= 0) follows.splice(index, 1); return; }
      if (index >= 0) throw new CommunityError('duplicate-follow');
      if (!users.some((item) => item.id === user.id)) users.push(structuredClone(user));
      follows.push({ followerId: user.id, followedId: targetId });
    },
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
      const favorite: Favorite = { id: sequence++, userId: user.id, targetType: kind, targetId };
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
      const authenticated = options.sessionStore?.user;
      if (!authenticated || !user) throw new CommunityError('session-required');
      if (authenticated.id !== user.id) throw new CommunityError('forbidden');
      if (!reviews.some((review) => review.id === reviewId)) throw new CommunityError('not-found');
      if (!text.trim()) throw new CommunityError('empty-text');
      while (comments.some((comment) => comment.id === sequence)) sequence++;
      const comment: Comment = { id: sequence++, parentCommentId: null, likeCount: 0, reviewId, userId: authenticated.id, text: text.trim(), createdAt: (options.clock?.() ?? new Date()).toISOString() };
      comments.push(comment);
      if (!users.some((item) => item.id === authenticated.id)) users.push(structuredClone(authenticated));
      return structuredClone(comment);
    },
    async getComments(reviewId) {
      return structuredClone(comments.filter((comment) => comment.reviewId === reviewId).map((comment) => {
        const author = users.find((item) => item.id === comment.userId);
        return { ...comment, author: { id: comment.userId, displayName: author?.displayName ?? 'Usuário indisponível', avatarUrl: author?.avatarUrl ?? null } };
      }));
    },
    async editReview(id, input, user) {
      if (!user) throw new CommunityError('session-required');
      const review = reviews.find((item) => item.id === id);
      if (!review) throw new CommunityError('not-found');
      if (review.userId !== user.id) throw new CommunityError('forbidden');
      if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5) throw new CommunityError('invalid-rating');
      review.text = input.text.trim(); review.rating = input.rating;
      const note = ratings.find(item => item.gameId === review.gameId && item.userId === user.id);
      if (note) note.value = input.rating; else ratings.push({ id: ratings.length + 1, gameId: review.gameId, userId: user.id, value: input.rating });
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
    async publish(gameId, input, user) {
      if (!user) throw new CommunityError('session-required');
      if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5) throw new CommunityError('invalid-rating');
      if (reviews.some((review) => review.gameId === gameId && review.userId === user.id)) throw new CommunityError('duplicate-review');
      while (reviews.some((review) => review.id === sequence)) sequence++;
      const review: Review = { id: sequence++, gameId, userId: user.id, rating: input.rating, text: input.text.trim(), createdAt: new Date().toISOString(), updatedAt: null };
      reviews.push(review);
      const note = ratings.find(item => item.gameId === gameId && item.userId === user.id);
      if (note) note.value = input.rating; else ratings.push({ id: ratings.length + 1, gameId, userId: user.id, value: input.rating });
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
    else { rating = { id: ratings.length + 1, gameId, userId: user.id, value }; ratings.push(rating); }
    return structuredClone(rating);
  } };
}
