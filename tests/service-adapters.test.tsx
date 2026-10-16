import { gamePage } from './fixtures';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices, readHttpConfig, type ApplicationServices } from '../src/services/runtime';
import { createTestApplicationServices } from './doubles/applicationServices';
import { createMockServices } from './doubles/services';
import { createMockNotificationService } from './doubles/notificationService';
import { gameFixtures } from './doubles/games';

test('configuração HTTP preserva URL e rejeita origem ausente ou inválida', () => {
  expect(readHttpConfig({ apiBaseUrl: ' https://api.example.test/ ' })).toEqual({ apiBaseUrl: 'https://api.example.test' });
  expect(() => readHttpConfig({})).toThrow();
  expect(() => readHttpConfig({apiBaseUrl:'invalid'})).toThrow();
});
test('runtime usa transporte HTTP substituível sem selecionar motor fictício', async () => {
  const transport=vi.fn(async()=>Response.json(gamePage()));
  const service=createDefaultApplicationServices({apiBaseUrl:'https://api.example.test'},{transport});
  expect(await service.games.list()).toEqual(gamePage());expect(transport).toHaveBeenCalledTimes(1);
  const double=createTestApplicationServices();expect((await double.games.list()).items).not.toHaveLength(0);
});
test('Home usa fornecedor alternativo pela mesma interface sem reescrita', async () => {
  const mock = createMockServices();
  const list = vi.fn(async () => gamePage([{ ...gameFixtures[0], id: 99, title: 'Catálogo alternativo' }]));
  const adapters: ApplicationServices = { ...mock, notifications: createMockNotificationService(), games: { list, async getById() { return null; }, async getOpinions() { return { averageRating: null, reviews: [] }; } } };
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Catálogo alternativo' })).toHaveAttribute('href', '/jogos/99');
  expect(list).toHaveBeenCalledWith({ term: '', sort: 'release-desc', page: 1, pageSize: 20 });
  expect(screen.queryByRole('link', { name: 'Ecos do Horizonte' })).not.toBeInTheDocument();
});
