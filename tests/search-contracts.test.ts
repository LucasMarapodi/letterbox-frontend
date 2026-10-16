import { expect, test, vi } from 'vitest';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { decodeSearch } from '../src/services/http/decoders';
import type { SearchQuery } from '../src/services/searchContracts';

const query: SearchQuery = { q: 'mario', mode: 'suggestions', scope: 'all', page: 1 };
const person = { id: 7, username: 'mario', displayName: 'Mario', avatarUrl: null };
const game = { id: 12, title: 'Mario', summary: '', coverUrl: null, releaseDate: null };
const ready = (items: unknown[]) => ({ status: 'ready', items, page: 1, pageSize: 5, hasNextPage: false, error: null, metadata: null });
const skipped = { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null };
const unavailable = { ...skipped, status: 'unavailable', error: { code: 'storage_unavailable', message: 'Indisponível' } };
const response = { query: 'mario', people: ready([person]), games: ready([game]), error: null };

test('projeções mínimas, IDs locais e metadata de Jogos não viram dados de Pessoas', () => {
  const decoded = decodeSearch({ ...response, games: { ...response.games, metadata: { fetchedAt: '2026-10-15T12:00:00Z', isStale: true } } }, query);
  expect(decoded.people.items).toEqual([person]);
  expect(decoded.games.items).toEqual([game]);
  expect(decoded.games.metadata).toMatchObject({ isStale: true });
  expect(decoded.people.metadata).toBeNull();
});

test('validação rejeita IDs legados, privacidade, limites e envelopes inconsistentes', () => {
  for (const invalid of [
    { ...response, query: 'outro' },
    { ...response, people: ready([{ ...person, id: '7' }]) },
    { ...response, games: ready([{ ...game, id: 0 }]) },
    { ...response, people: ready([{ ...person, email: 'private@example.test' }]) },
    { ...response, games: ready(Array.from({ length: 6 }, () => game)) },
    { ...response, people: { ...response.people, page: 2 } },
    { ...response, people: { ...response.people, pageSize: 20 } },
    { ...response, people: skipped },
    { ...response, games: { ...unavailable, page: 1 } },
    { ...response, people: unavailable, games: unavailable },
    { ...response, error: { code: 'search_unavailable', message: 'Falha' } },
  ]) expect(() => decodeSearch(invalid, query)).toThrow();
});

test('503 usa envelope de busca tipado e retry de um grupo preserva notRequested', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({ ...response, people: unavailable, games: unavailable, error: { code: 'search_unavailable', message: 'Falha' } }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ ...response, people: skipped, games: unavailable, error: { code: 'search_unavailable', message: 'Falha' } }, { status: 503 }));
  const service = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport }).search!;
  expect((await service.search(query)).people.status).toBe('unavailable');
  const retry = await service.search({ ...query, scope: 'games' });
  expect(retry.people.status).toBe('notRequested');
  expect(retry.games.status).toBe('unavailable');
  expect(transport).toHaveBeenCalledTimes(2);
});

test('consulta inválida é rejeitada antes de HTTP e AbortSignal é propagado', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValue(Response.json(response));
  const service = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport }).search!;
  for (const q of ['', 'ab', 'a'.repeat(201), 'mar\nio']) expect(() => service.search({ ...query, q })).toThrow();
  expect(transport).not.toHaveBeenCalled();
  const controller = new AbortController();
  await service.search(query, controller.signal);
  expect(transport.mock.calls[0][1].signal).toBe(controller.signal);
});
