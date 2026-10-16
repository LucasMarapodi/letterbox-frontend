import { withFilterOptions } from './http-fixtures';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireGame, wirePage, wireReview, wireUser, withAuthentication } from './http-fixtures';

function expectNoFavorites(): void {
  for (const name of ['Favoritos', 'Jogos favoritos', 'Reviews favoritas']) {
    expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument();
  }
  for (const text of ['Carregando favoritos…', 'Não foi possível carregar os favoritos.', 'Nenhum jogo favorito.', 'Nenhuma review favorita.']) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
  expect(document.querySelector('.favorites-sections')).toBeNull();
}

async function open(options: { dashboard: boolean; login?: boolean; empty?: boolean; dashboardResponse?: FetchTransport }) {
  const favorites = { games: options.empty ? [] : [wireGame], reviews: options.empty ? [] : [wireReview] };
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const query = new URL(url);
    const path = query.pathname;
    if (path === '/api/v1/games') return Response.json({ ...wirePage([wireGame]), page: Number(query.searchParams.get('page') ?? 1), hasNextPage: true });
    if (path === '/api/v1/dashboard') return options.dashboardResponse ? options.dashboardResponse(url, init) : Response.json({ favorites, feed: [wireReview] });
    if (path === '/api/v1/feed/following') return Response.json([wireReview]);
    if (path === '/api/v1/favorites') return Response.json(favorites);
    if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
    if (path === '/api/v1/users/1') return Response.json(wireUser);
    throw new Error(`Consulta inesperada: ${path}`);
  }, { isolateDashboard: false }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  // undefined reproduz a composição sem dashboard agregado, que antes montava favoritos.
  services.privateFeatures = { ...services.privateFeatures, dashboard: options.dashboard ? true : undefined };
  if (!options.login) await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[options.login ? '/login' : '/']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  if (options.login) {
    await interaction.type(screen.getByLabelText('E-mail', { exact: true }), 'test@example.test');
    await interaction.type(screen.getByLabelText('Senha', { exact: true }), 'test-only');
    await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  }
  await screen.findByRole('link', { name: 'Meu perfil' });
  await within(await screen.findByRole('region', { name: 'Jogos' })).findByRole('link', { name: wireGame.title });
  return { interaction, transport };
}

const cases = [true, false].flatMap(dashboard => [true, false].flatMap(login => [true, false].map(empty => ({ dashboard, login, empty }))));
test.each(cases)('Início sem favoritos, feed preservado e perfil disponível: %j', async options => {
  const { interaction, transport } = await open(options);
  expect(await within(await screen.findByRole('region', { name: 'Feed de reviews' })).findByText(wireReview.text)).toBeVisible();
  expectNoFavorites();
  await screen.findByRole('button', { name: options.empty ? 'Favoritar review de Ana' : 'Remover review de Ana dos favoritos' });
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/favorites')).toHaveLength(options.dashboard ? 0 : 1);
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  const games = await screen.findByRole('region', { name: 'Jogos favoritos' });
  if (options.empty) expect(within(games).getByText('Nenhum jogo favorito.')).toBeVisible();
  else {
    expect(within(games).getByRole('link', { name: wireGame.title })).toHaveAttribute('href', '/jogos/12');
    expect(screen.getByRole('region', { name: 'Reviews favoritas' })).toBeVisible();
  }
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/favorites')).toHaveLength(options.dashboard ? 1 : 2);
});

test('dashboard preserva loading, erro e retry sem montar favoritos', async () => {
  const pending = deferred<Response>();
  const dashboardResponse = vi.fn<FetchTransport>().mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(Response.json({ favorites: { games: [wireGame], reviews: [wireReview] }, feed: [wireReview] }));
  const { interaction, transport } = await open({ dashboard: true, dashboardResponse });
  expect(screen.getByText('Carregando seu dashboard…')).toBeVisible();
  expect(screen.getByRole('region', { name: 'Seu dashboard' })).toHaveAttribute('aria-busy', 'true');
  expectNoFavorites();
  await act(async () => { pending.resolve(Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 })); });
  expect(await screen.findByText('Não foi possível carregar seu dashboard.')).toBeVisible();
  expectNoFavorites();
  await interaction.click(within(screen.getByRole('region', { name: 'Seu dashboard' })).getByRole('button', { name: 'Tentar novamente' }));
  expect(await within(await screen.findByRole('region', { name: 'Feed de reviews' })).findByText(wireReview.text)).toBeVisible();
  expectNoFavorites();
  expect(dashboardResponse).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls.some(([url]) => url.endsWith('/favorites'))).toBe(false);
});

test.each([true, false])('busca, ordenação, paginação e atualização do feed preservados; dashboard=%s', async dashboard => {
  const { interaction, transport } = await open({ dashboard });
  await screen.findByRole('button', { name: 'Atualizar feed' });
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'aventura');
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await within(screen.getByRole('region', { name: 'Jogos' })).findByRole('link', { name: wireGame.title });
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await within(screen.getByRole('region', { name: 'Jogos' })).findByRole('link', { name: wireGame.title });
  await interaction.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(await screen.findByText('Página 2')).toBeVisible();
  const lastCatalogCall = transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games').at(-1);
  expect(lastCatalogCall).toBeDefined();
  const query = new URL(lastCatalogCall![0]).searchParams;
  expect(query.get('term')).toBe('aventura'); expect(query.get('sort')).toBe('name-desc'); expect(query.get('page')).toBe('2');
  const feedCalls = transport.mock.calls.filter(([url]) => url.endsWith('/feed/following')).length;
  await interaction.click(screen.getByRole('button', { name: 'Atualizar feed' }));
  await within(screen.getByRole('region', { name: 'Feed de reviews' })).findByText(wireReview.text);
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/feed/following'))).toHaveLength(feedCalls + 1);
  expectNoFavorites();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/favorites'))).toHaveLength(dashboard ? 0 : 1);
});
