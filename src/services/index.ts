import type { Services } from './contracts';
import { createMockGameService } from '../mocks/gameService';
import { community } from './community';

export function createServices(overrides: Partial<Services> = {}): Services {
  return { games: overrides.games ?? { ...createMockGameService(), getOpinions: (id) => community.getOpinions(id) } };
}

export const services: Services = createServices();
