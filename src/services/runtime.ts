import type { GameService } from './contracts';
import type { AuthService } from './authContracts';
import type { CommunityService } from './communityContracts';
import type { NotificationService } from './notificationContracts';
import type { DashboardService } from './dashboardContracts';
import { createMockServices } from '../mocks/services';
import { createMockGameService } from '../mocks/gameService';
import { createMockNotificationService } from '../mocks/notificationService';
import type { FetchTransport } from './http/client';
import { HttpFailure } from './http/client';
import { createHttpAdapters, createHttpSessionStore, readHttpConfig, type HttpAdapters, type HttpSessionStore } from './http/adapters';
import { createHttpAuthService } from './http/authService';
import { createHttpGameService } from './http/gameService';
import { createHttpProfileService } from './http/profileService';
import { createHttpFollowService, createHttpFavoriteService } from './http/socialService';
import { createHttpRatingService, createHttpPublishingService, createHttpReviewService, createHttpCommentService } from './http/opinionService';
import { communityRequest } from './http/opinionService';
// Infraestrutura preparada; ativação de cada domínio ocorre nas US de integração.
export { createHttpAdapters, createHttpSessionStore, readHttpConfig } from './http/adapters';
export type PrivateFeature = 'opinions' | 'rating' | 'publishReview' | 'editReview' | 'comments' | 'favorites' | 'follows' | 'dashboard' | 'feed' | 'notifications';
export interface ApplicationServices { games: GameService; auth: AuthService; community: CommunityService; notifications: NotificationService; dashboard?: DashboardService; privateFeatures?: Partial<Record<PrivateFeature, boolean>>; http?: () => HttpAdapters; }
export interface ServiceConfig { apiBaseUrl: string; implementation: 'mock' | 'custom'; }
export function readServiceConfig(input: { apiBaseUrl?: unknown; implementation?: unknown } = {}): ServiceConfig {
  const implementation = input.implementation ?? 'mock';
  if (implementation !== 'mock' && implementation !== 'custom') throw new Error('Implementação de serviços desconhecida.');
  return { apiBaseUrl: typeof input.apiBaseUrl === 'string' ? input.apiBaseUrl.trim() : '', implementation };
}
export function createApplicationServices(config: ServiceConfig, adapters?: ApplicationServices): ApplicationServices {
  if (config.implementation === 'custom') {
    if (!adapters) throw new Error('Forneça os adaptadores para a implementação custom.');
    return adapters;
  }
  const mock = createMockServices();
  return { ...mock, notifications: createMockNotificationService(), games: { ...createMockGameService(), getOpinions: (id) => mock.community.getOpinions(id) } };
}
export const serviceConfig = readServiceConfig({ apiBaseUrl: import.meta.env.VITE_API_BASE_URL });
export function createDefaultApplicationServices(config: { apiBaseUrl?: unknown }, options: { transport?: FetchTransport; session?: HttpSessionStore } = {}): ApplicationServices {
  const previous = createApplicationServices({ apiBaseUrl: '', implementation: 'mock' });
  const session = options.session ?? createHttpSessionStore();
  let http: HttpAdapters | undefined;
  const getHttp = (): HttpAdapters => http ??= createHttpAdapters(readHttpConfig(config), { ...options, session });
  const unavailable = async (): Promise<never> => { throw new HttpFailure('configuration'); };
  return {
    ...previous, auth: createHttpAuthService(getHttp, session), games: createHttpGameService(getHttp), http: getHttp,
    privateFeatures: { opinions: false, rating: true, publishReview: true, editReview: true, comments: true, favorites: true, follows: true, dashboard: true, feed: true, notifications: false },
    dashboard: { get: () => communityRequest(() => getHttp().community.dashboard()) },
    community: {
      ...previous.community,
      ...createHttpProfileService(getHttp),
      ...createHttpRatingService(getHttp),
      ...createHttpPublishingService(getHttp),
      ...createHttpReviewService(getHttp),
      ...createHttpCommentService(getHttp),
      ...createHttpFollowService(getHttp),
      ...createHttpFavoriteService(getHttp),
      getFeed: () => communityRequest(() => getHttp().community.feed()),
    },
    notifications: { list: unavailable },
  };
}
export const defaultApplicationServices = createDefaultApplicationServices({ apiBaseUrl: import.meta.env.VITE_API_BASE_URL });
