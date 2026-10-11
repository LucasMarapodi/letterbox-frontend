import type { GameService } from './contracts';
import type { AuthService } from './authContracts';
import type { CommunityService } from './communityContracts';
import type { NotificationService } from './notificationContracts';
export interface ApplicationServices { games: GameService; auth: AuthService; community: CommunityService; notifications: NotificationService; }
export interface ServiceConfig { apiBaseUrl: string; implementation: 'mock' | 'custom'; }
export function readServiceConfig(_input: { apiBaseUrl?: unknown; implementation?: unknown } = {}): ServiceConfig {
  void _input; return { apiBaseUrl: '', implementation: 'mock' };
}
export function createApplicationServices(_config: ServiceConfig, _adapters?: ApplicationServices): ApplicationServices {
  void _config; void _adapters; throw new Error('US-30 pendente');
}
