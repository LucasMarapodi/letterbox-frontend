import type { ReviewId, UserId, GameId, Rating, User, Review, Comment, Favorite, Game } from '../models';
import type { GameOpinions, PublicReview } from './contracts';
export interface ReviewDetails extends PublicReview { game: { id: GameId; title: string }; }
export interface PublicComment extends Comment { author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>; }
export interface PublicProfile { user: User; reviews: ReviewDetails[]; }
export type FavoriteKind = 'game' | 'review';
export interface FavoriteLists { games: Game[]; reviews: ReviewDetails[]; }
export interface Connections { followers: User[]; following: User[]; }
export type RankingPeriod = '24h' | '7d' | '30d';
export interface RankedReview { review: ReviewDetails; commentCount: number; lastCommentAt: string; }
export interface RankedGame { game: Game; commentCount: number; lastCommentAt: string; }
export function isRankingPeriod(value: unknown): value is RankingPeriod { return value === '24h' || value === '7d' || value === '30d'; }

export class CommunityError extends Error {
  constructor(public readonly code: 'session-required' | 'invalid-rating' | 'empty-text' | 'duplicate-review' | 'forbidden' | 'not-found' | 'self-follow' | 'duplicate-follow') { super(code); }
}
export interface CommunityService {
  getGameReviews(gameId: GameId): Promise<PublicReview[]>;
  getGamesInDiscussion(period: RankingPeriod): Promise<RankedGame[]>;
  getMostCommented(period: RankingPeriod): Promise<RankedReview[]>;
  getRecentReviews(): Promise<ReviewDetails[]>;
  getFeed(user: User | null): Promise<ReviewDetails[]>;
  getConnections(profileId: UserId): Promise<Connections>;
  isFollowing(targetId: UserId, user: User | null): Promise<boolean>;
  setFollowing(targetId: UserId, selected: boolean, user: User | null): Promise<void | boolean>;
  getFavorites(user: User | null): Promise<FavoriteLists>;
  getFavorite(kind: FavoriteKind, targetId: ReviewId | GameId, user: User | null): Promise<Favorite | null>;
  setFavorite(kind: FavoriteKind, targetId: ReviewId | GameId, selected: boolean, user: User | null): Promise<Favorite | null>;
  getProfile(id: UserId, sessionUser?: User | null): Promise<PublicProfile | null>;
  rate(gameId: GameId, value: number, user: User | null): Promise<Rating>;
  getRating(gameId: GameId, user: User | null): Promise<Rating | null>;
  publish(gameId: GameId, text: string, user: User | null): Promise<Review>;
  findOwnReview(gameId: GameId, user: User): Promise<Review | null>;
  getOpinions(gameId: GameId): Promise<GameOpinions>;
  getReview(id: ReviewId): Promise<ReviewDetails | null>;
  editReview(id: ReviewId, text: string, user: User | null): Promise<Review>;
  getComments(reviewId: ReviewId): Promise<PublicComment[]>;
  comment(reviewId: ReviewId, text: string, user: User | null): Promise<Comment>;
}
