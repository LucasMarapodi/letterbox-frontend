import type { PublicProfile, Connections } from '../communityContracts';
import type { PublicUserResponse, GameResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, NotificationResponse, LoginResponse, DashboardResponse, GameOpinionsResponse, FavoriteListsResponse, RankedReviewResponse, RankedGameResponse } from './dtos';
import { HttpFailure } from './client';
export type Decoder<T> = (value: unknown) => T;
function pending<T>(value: unknown): T { void value; throw new HttpFailure('contract'); }
export const decodeUser: Decoder<PublicUserResponse> = pending;
export const decodeGame: Decoder<GameResponse> = pending;
export const decodeReview: Decoder<ReviewResponse> = pending;
export const decodeComment: Decoder<CommentResponse> = pending;
export const decodeRating: Decoder<RatingResponse> = pending;
export const decodeFavorite: Decoder<FavoriteResponse> = pending;
export const decodeNotification: Decoder<NotificationResponse> = pending;
export const decodeLogin: Decoder<LoginResponse> = pending;
export const decodeDashboard: Decoder<DashboardResponse> = pending;
export const decodeOpinions: Decoder<GameOpinionsResponse> = pending;
export const decodeFavoriteLists: Decoder<FavoriteListsResponse> = pending;
export const decodeRankedReview: Decoder<RankedReviewResponse> = pending;
export const decodeRankedGame: Decoder<RankedGameResponse> = pending;
export const unwrapRating: Decoder<RatingResponse | null> = pending;
export const unwrapReview: Decoder<ReviewResponse | null> = pending;
export const unwrapFavorite: Decoder<FavoriteResponse | null> = pending;
export const unwrapFollowing: Decoder<boolean> = pending;
export function decodeList<T>(value: unknown, item: Decoder<T>): T[] { void item; return pending(value); }
export function composeProfile(user: unknown, reviews: unknown): PublicProfile { void reviews; return pending(user); }
export function composeConnections(followers: unknown, following: unknown): Connections { void following; return pending(followers); }
