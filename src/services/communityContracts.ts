import type { Id, Rating, User, Review, Comment, Favorite, Game } from '../models';
import type { GameOpinions, PublicReview } from './contracts';
export interface ReviewDetails extends PublicReview { game: { id: Id; title: string }; }
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
  getGameReviews(gameId: Id): Promise<PublicReview[]>;
  getGamesInDiscussion(period: RankingPeriod): Promise<RankedGame[]>;
  getMostCommented(period: RankingPeriod): Promise<RankedReview[]>;
  getRecentReviews(): Promise<ReviewDetails[]>;
  getFeed(user: User | null): Promise<ReviewDetails[]>;
  getConnections(profileId: Id): Promise<Connections>;
  isFollowing(targetId: Id, user: User | null): Promise<boolean>;
  setFollowing(targetId: Id, selected: boolean, user: User | null): Promise<void>;
  getFavorites(user: User | null): Promise<FavoriteLists>;
  getFavorite(kind: FavoriteKind, targetId: Id, user: User | null): Promise<Favorite | null>;
  setFavorite(kind: FavoriteKind, targetId: Id, selected: boolean, user: User | null): Promise<Favorite | null>;
  getProfile(id: Id, sessionUser?: User | null): Promise<PublicProfile | null>;
  rate(gameId: Id, value: number, user: User | null): Promise<Rating>;
  getRating(gameId: Id, user: User | null): Promise<Rating | null>;
  publish(gameId: Id, text: string, user: User | null): Promise<Review>;
  findOwnReview(gameId: Id, user: User): Promise<Review | null>;
  getOpinions(gameId: Id): Promise<GameOpinions>;
  getReview(id: Id): Promise<ReviewDetails | null>;
  editReview(id: Id, text: string, user: User | null): Promise<Review>;
  getComments(reviewId: Id): Promise<PublicComment[]>;
  comment(reviewId: Id, text: string, user: User | null): Promise<Comment>;
}
