import type { GameService } from './contracts';
import type { AuthService } from './authContracts';
import type { CommunityService } from './communityContracts';
import type { NotificationService } from './notificationContracts';
import { createMockServices } from '../mocks/services';
import { createMockGameService } from '../mocks/gameService';
import { createMockNotificationService } from '../mocks/notificationService';
import type { FetchTransport } from './http/client';
// Infraestrutura preparada; ativação de cada domínio ocorre nas US de integração.
export { createHttpAdapters, createHttpSessionStore, readHttpConfig } from './http/adapters';
export interface ApplicationServices { games: GameService; auth: AuthService; community: CommunityService; notifications: NotificationService; }
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
export const defaultApplicationServices = createApplicationServices(serviceConfig);
export function createDefaultApplicationServices(config: { apiBaseUrl?: unknown }, options: { transport?: FetchTransport } = {}): ApplicationServices {
  void config; void options;
  return createApplicationServices({ apiBaseUrl: '', implementation: 'mock' });
}
