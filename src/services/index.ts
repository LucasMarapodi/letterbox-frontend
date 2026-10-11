import type { Services } from './contracts';
import { createMockGameService } from '../mocks/gameService';

export function createServices(overrides: Partial<Services> = {}): Services {
  return { games: overrides.games ?? createMockGameService() };
}

export const services: Services = createServices();
