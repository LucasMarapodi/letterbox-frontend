import type { Game } from '../models';
import type { GameService } from '../services/contracts';

export interface MockGameOptions {
  games?: Game[];
  error?: Error;
}

/** Ponto de teste ainda sem leitura funcional. */
export function createMockGameService(_options: MockGameOptions = {}): GameService {
  return {
    async list() { throw new Error('Leitura não implementada.'); },
    async getById() { throw new Error('Leitura não implementada.'); },
  };
}
