import { expect, test } from 'vitest';
import type { Game } from '../src/models';
import { createMockGameService } from '../src/mocks/gameService';

function gameFixture(): Game {
  return { id: 'game-1', title: 'Aventura de exemplo', summary: 'Um jogo fictício.', coverUrl: null, genres: ['Aventura'], platforms: ['PC'], releaseDate: null, averageRating: null };
}

test('leitura assíncrona retorna jogos tipados', async () => {
  const game: Game = gameFixture();
  const service = createMockGameService({ games: [game] });
  await expect(service.list()).resolves.toEqual([game]);
});

test('localiza por ID e representa jogo inexistente sem inventar dados', async () => {
  const game: Game = gameFixture();
  const service = createMockGameService({ games: [game] });
  await expect(service.getById('game-1')).resolves.toEqual(game);
  await expect(service.getById('inexistente')).resolves.toBeNull();
});

test('permite simular rejeição nas duas leituras', async () => {
  const error: Error = new Error('Falha simulada de leitura.');
  const service = createMockGameService({ error });
  await expect(service.list()).rejects.toBe(error);
  await expect(service.getById('game-1')).rejects.toBe(error);
});

test('isola cada instância, os dados recebidos e os objetos retornados', async () => {
  const game: Game = gameFixture();
  const seed: Game[] = [game];
  const first = createMockGameService({ games: seed });
  const second = createMockGameService({ games: seed });
  game.genres.push('Alteração externa');
  seed.length = 0;
  const result: Game[] = await first.list();
  const returned: Game | undefined = result[0];
  expect(returned).toBeDefined();
  if (!returned) throw new Error('Fixture ausente.');
  returned.title = 'Alterado';
  returned.genres.push('Alteração no retorno');
  result.length = 0;
  await expect(first.list()).resolves.toEqual([gameFixture()]);
  await expect(second.getById('game-1')).resolves.toEqual(gameFixture());
});

test('instâncias padrão possuem fixtures independentes e determinísticas', async () => {
  const first = createMockGameService();
  const second = createMockGameService();
  const original: Game[] = await second.list();
  expect(original.length).toBeGreaterThan(0);
  const result: Game[] = await first.list();
  result.splice(0);
  await expect(first.list()).resolves.toEqual(original);
  await expect(second.list()).resolves.toEqual(original);
});

test('permite conjunto vazio explícito', async () => {
  await expect(createMockGameService({ games: [] }).list()).resolves.toEqual([]);
});

test('busca provisória filtra por trecho do nome sem diferenciar maiúsculas', async () => {
  const first: Game = gameFixture();
  const second: Game = { ...gameFixture(), id: 'game-2', title: 'Corrida' };
  const service = createMockGameService({ games: [first, second] });
  await expect(service.list({ term: '  AVENTURA  ' })).resolves.toEqual([first]);
  await expect(service.list({ term: 'inexistente' })).resolves.toEqual([]);
  await expect(service.list({ term: '' })).resolves.toEqual([first, second]);
  await expect(service.list({ term: '   ' })).resolves.toEqual([first, second]);
});

test('ordena por nome nos dois sentidos sem alterar a origem e mantém o filtro', async () => {
  const zeta: Game = { ...gameFixture(), id: 'z', title: 'Zeta game' };
  const alpha: Game = { ...gameFixture(), id: 'a', title: 'Alpha game' };
  const other: Game = { ...gameFixture(), id: 'o', title: 'Outro' };
  const seed: Game[] = [zeta, other, alpha];
  const service = createMockGameService({ games: seed });
  await expect(service.list({ term: 'game', sort: 'name-asc' })).resolves.toEqual([alpha, zeta]);
  await expect(service.list({ term: 'game', sort: 'name-desc' })).resolves.toEqual([zeta, alpha]);
  await expect(service.list()).resolves.toEqual(seed);
  expect(seed).toEqual([zeta, other, alpha]);
});
