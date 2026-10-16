import { expect, test } from 'vitest';
import { createServices } from '../src/services';
import type { GameService } from '../src/services/contracts';

test('centraliza o mock padrão sem exigir que a tela importe fixtures', async () => {
  const services = createServices();
  expect((await services.games.list()).length).toBeGreaterThan(0);
});

test('permite substituir a implementação mantendo o contrato público', async () => {
  const games: GameService = {
    async list() { return []; },
    async getById() { return null; },
  };
  const services = createServices({ games });
  expect(services.games).toBe(games);
  await expect(services.games.list()).resolves.toEqual([]);
});
