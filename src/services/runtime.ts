import type { GameService } from './contracts';
import type { AuthService } from './authContracts';
import type { CommunityService } from './communityContracts';
import type { NotificationService } from './notificationContracts';
import type { DashboardService } from './dashboardContracts';
import type { FetchTransport } from './http/client';
import { createHttpAdapters, createHttpSessionStore, readHttpConfig, type HttpAdapters, type HttpSessionStore } from './http/adapters';
import { createHttpAuthService } from './http/authService';
import { createHttpGameService } from './http/gameService';
import { createHttpProfileService } from './http/profileService';
import { createHttpFollowService, createHttpFavoriteService } from './http/socialService';
import { createHttpRatingService, createHttpPublishingService, createHttpReviewService, createHttpCommentService } from './http/opinionService';
import { communityRequest } from './http/opinionService';
import { createHttpCommunityQueries } from './http/communityService';
// HTTP é a única fonte de negócio na aplicação.
export { createHttpAdapters, createHttpSessionStore, readHttpConfig } from './http/adapters';
export type PrivateFeature = 'opinions' | 'rating' | 'publishReview' | 'editReview' | 'comments' | 'favorites' | 'follows' | 'dashboard' | 'feed' | 'notifications';
export interface ApplicationServices { games: GameService; auth: AuthService; community: CommunityService; notifications: NotificationService; dashboard?: DashboardService; privateFeatures?: Partial<Record<PrivateFeature, boolean>>; http?: () => HttpAdapters; }
export function createDefaultApplicationServices(config: { apiBaseUrl?: unknown }, options: { transport?: FetchTransport; session?: HttpSessionStore } = {}): ApplicationServices {
  const session = options.session ?? createHttpSessionStore();
  let http: HttpAdapters | undefined;
  const getHttp = (): HttpAdapters => http ??= createHttpAdapters(readHttpConfig(config), { ...options, session });
  return {
    auth: createHttpAuthService(getHttp, session), games: createHttpGameService(getHttp), http: getHttp,
    privateFeatures: { opinions: false, rating: true, publishReview: true, editReview: true, comments: true, favorites: true, follows: true, dashboard: true, feed: true, notifications: true },
    dashboard: { get: () => communityRequest(() => getHttp().community.dashboard()) },
    community: {
      getOpinions: (id) => getHttp().games.opinions(id),
      ...createHttpProfileService(getHttp),
      ...createHttpRatingService(getHttp),
      ...createHttpPublishingService(getHttp),
      ...createHttpReviewService(getHttp),
      ...createHttpCommentService(getHttp),
      ...createHttpFollowService(getHttp),
      ...createHttpFavoriteService(getHttp),
      ...createHttpCommunityQueries(getHttp),
      getFeed: () => communityRequest(() => getHttp().community.feed()),
    },
    notifications: { list: () => getHttp().notifications.list() },
  };
}
export const defaultApplicationServices = createDefaultApplicationServices({ apiBaseUrl: import.meta.env.VITE_API_BASE_URL });
