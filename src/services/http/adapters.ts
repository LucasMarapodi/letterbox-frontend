import type { PublicProfile, Connections, FavoriteKind, RankingPeriod } from '../communityContracts';
import type { GameQuery } from '../contracts';
import type { User } from '../../models';
import type { LoginRequest, RegisterRequest, LoginResponse, PublicUserResponse, GameResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, GameOpinionsResponse, FavoriteListsResponse, DashboardResponse, RankedReviewResponse, RankedGameResponse, NotificationResponse, ProfilePatchRequest, TextRequest, RatingRequest } from './dtos';
import { HttpFailure, type FetchTransport } from './client';
export interface SessionSnapshot { token: string; user: User; expiresAt: string; version: number; signal: AbortSignal; }
export interface HttpSessionStore { current(): SessionSnapshot | null; version(): number; establish(login: LoginResponse): void; clear(): void; }
export interface HttpAdapterConfig { apiBaseUrl: string; }
export interface HttpAdapters {
  session: HttpSessionStore;
  auth: {
    register(input: RegisterRequest, signal?: AbortSignal): Promise<PublicUserResponse>;
    login(input: LoginRequest, signal?: AbortSignal): Promise<LoginResponse>;
    me(signal?: AbortSignal): Promise<PublicUserResponse>;
    logout(signal?: AbortSignal): Promise<void>;
  };
  games: {
    list(query?: GameQuery, signal?: AbortSignal): Promise<GameResponse[]>;
    get(id: string, signal?: AbortSignal): Promise<GameResponse>;
    opinions(id: string, signal?: AbortSignal): Promise<GameOpinionsResponse>;
    reviews(id: string, signal?: AbortSignal): Promise<ReviewResponse[]>;
    myRating(id: string, signal?: AbortSignal): Promise<RatingResponse | null>;
    rate(id: string, input: RatingRequest, signal?: AbortSignal): Promise<RatingResponse>;
    myReview(id: string, signal?: AbortSignal): Promise<ReviewResponse | null>;
    publish(id: string, input: TextRequest, signal?: AbortSignal): Promise<ReviewResponse>;
  };
  reviews: {
    get(id: string, signal?: AbortSignal): Promise<ReviewResponse>;
    edit(id: string, input: TextRequest, signal?: AbortSignal): Promise<ReviewResponse>;
    comments(id: string, signal?: AbortSignal): Promise<CommentResponse[]>;
    comment(id: string, input: TextRequest, signal?: AbortSignal): Promise<CommentResponse>;
  };
  profiles: {
    get(id: string, signal?: AbortSignal): Promise<PublicUserResponse>;
    reviews(id: string, signal?: AbortSignal): Promise<ReviewResponse[]>;
    profile(id: string, signal?: AbortSignal): Promise<PublicProfile>;
    edit(input: ProfilePatchRequest, signal?: AbortSignal): Promise<PublicUserResponse>;
    followers(id: string, signal?: AbortSignal): Promise<PublicUserResponse[]>;
    following(id: string, signal?: AbortSignal): Promise<PublicUserResponse[]>;
    connections(id: string, signal?: AbortSignal): Promise<Connections>;
  };
  social: {
    favorites(signal?: AbortSignal): Promise<FavoriteListsResponse>;
    favorite(kind: FavoriteKind, id: string, signal?: AbortSignal): Promise<FavoriteResponse | null>;
    setFavorite(kind: FavoriteKind, id: string, selected: boolean, signal?: AbortSignal): Promise<FavoriteResponse | null>;
    isFollowing(id: string, signal?: AbortSignal): Promise<boolean>;
    setFollowing(id: string, selected: boolean, signal?: AbortSignal): Promise<boolean>;
  };
  community: {
    recent(signal?: AbortSignal): Promise<ReviewResponse[]>;
    mostCommented(period: RankingPeriod, signal?: AbortSignal): Promise<RankedReviewResponse[]>;
    gamesInDiscussion(period: RankingPeriod, signal?: AbortSignal): Promise<RankedGameResponse[]>;
    feed(signal?: AbortSignal): Promise<ReviewResponse[]>;
    dashboard(signal?: AbortSignal): Promise<DashboardResponse>;
  };
  notifications: { list(signal?: AbortSignal): Promise<NotificationResponse[]>; };
}
export function readHttpConfig(input: { apiBaseUrl?: unknown }): HttpAdapterConfig { void input; throw new HttpFailure('configuration'); }
export function createHttpSessionStore(): HttpSessionStore { throw new HttpFailure('configuration'); }
export function createHttpAdapters(config: HttpAdapterConfig, options: { transport?: FetchTransport; session?: HttpSessionStore } = {}): HttpAdapters { void config; void options; throw new HttpFailure('configuration'); }
