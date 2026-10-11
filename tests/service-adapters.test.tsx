import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createApplicationServices, readServiceConfig, type ApplicationServices } from '../src/services/runtime';
import { createMockServices } from '../src/mocks/services';
import { createMockNotificationService } from '../src/mocks/notificationService';
import { gameFixtures } from '../src/mocks/games';

test('configuração central preserva URL e rejeita seleção desconhecida', () => {
  expect(readServiceConfig({ apiBaseUrl: ' https://api.example.test/ ', implementation: 'custom' })).toEqual({ apiBaseUrl: 'https://api.example.test/', implementation: 'custom' });
  expect(readServiceConfig()).toEqual({ apiBaseUrl: '', implementation: 'mock' });
  expect(() => readServiceConfig({ implementation: 'http-inventado' })).toThrow();
});
test('mesma operação funciona com mock e fake sem chamadas reais', async () => {
  const mock = createApplicationServices({ apiBaseUrl: '', implementation: 'mock' });
  expect((await mock.games.list()).length).toBeGreaterThan(0);
  const fake: ApplicationServices = { ...mock, games: { ...mock.games, list: async () => [] } };
  expect(await createApplicationServices({ apiBaseUrl: 'https://api.example.test/', implementation: 'custom' }, fake).games.list()).toEqual([]);
  expect(() => createApplicationServices({ apiBaseUrl: '', implementation: 'custom' })).toThrow();
});
test('Home usa fornecedor alternativo pela mesma interface sem reescrita', async () => {
  const mock = createMockServices();
  const list = vi.fn(async () => [{ ...gameFixtures[0], id: 'fake-game', title: 'Catálogo alternativo' }]);
  const adapters: ApplicationServices = { ...mock, notifications: createMockNotificationService(), games: { list, async getById() { return null; }, async getOpinions() { return { averageRating: null, reviews: [] }; } } };
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Catálogo alternativo' })).toHaveAttribute('href', '/jogos/fake-game');
  expect(list).toHaveBeenCalledWith({ term: '', sort: 'name-asc' });
  expect(screen.queryByRole('link', { name: 'Ecos do Horizonte' })).not.toBeInTheDocument();
});
