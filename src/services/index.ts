import type { Services } from './contracts';

export function createServices(_overrides: Partial<Services> = {}): Services {
  throw new Error('Seleção de serviços não implementada.');
}
