import type { Services } from './contracts';
import { defaultApplicationServices } from './runtime';

export function createServices(overrides: Partial<Services> = {}): Services {
  return { games: overrides.games ?? defaultApplicationServices.games };
}

export const services: Services = createServices();
