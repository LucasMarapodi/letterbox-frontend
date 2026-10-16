import type { User, Game, Rating, Favorite } from '../../models';
import type { ReviewDetails, PublicComment, FavoriteLists, RankedReview, RankedGame } from '../communityContracts';
import type { NotificationItem } from '../notificationContracts';
export type PublicUserResponse = User;
export type GameResponse = Game;
export interface GamePageResponse { items: GameResponse[]; page: number; pageSize: number; hasNextPage: boolean; }
export type RatingResponse = Rating;
export type FavoriteResponse = Favorite;
export interface ReviewLikeStatusResponse { likedByMe: boolean; }
export interface CommentLikeStatusResponse { likedByMe: boolean; }
export interface ReviewResponse extends ReviewDetails { game: { id: number; title: string; coverUrl: string | null }; }
export type CommentResponse = PublicComment;
export type NotificationResponse = NotificationItem;
export interface LoginResponse { token: string; expiresAt: string; user: PublicUserResponse; }
export interface MyRatingResponse { rating: RatingResponse | null; }
export interface MyReviewResponse { review: ReviewResponse | null; }
export interface FavoriteStatusResponse { favorite: FavoriteResponse | null; }
export interface FollowStatusResponse { following: boolean; }
export interface GameOpinionsResponse { averageRating: number | null; reviews: ReviewResponse[]; }
export interface FavoriteListsResponse extends FavoriteLists { reviews: ReviewResponse[]; }
export interface DashboardResponse { favorites: FavoriteListsResponse; feed: ReviewResponse[]; }
export interface RankedReviewResponse extends RankedReview { review: ReviewResponse; }
export type RankedGameResponse = RankedGame;
export interface RegisterRequest { name: string; email: string; password: string; }
export interface LoginRequest { email: string; password: string; }
export interface RatingRequest { value: number; }
export interface TextRequest { text: string; }
export interface ReviewRequest { rating: number; text?: string | null; }
export interface ReviewPatchRequest { rating?: number; text?: string | null; }
export interface ProfilePatchRequest { displayName?: string; bio?: string | null; avatarUrl?: string | null; country?: string | null; state?: string | null; favoriteGameIds?: number[]; }
export interface ProfileUpdateResponse extends PublicUserResponse { completion: ProfileCompletionResponse; }
export interface ProfileCompletionRequest { country: string; state: string; bio: string; avatarUrl?: string | null; favoriteGameIds: number[]; }
export interface ProfileCompletionResponse { country: string | null; state: string | null; bio: string; avatarUrl: string | null; favoriteGameIds: number[]; favoriteGameCount: number; isComplete: boolean; }
