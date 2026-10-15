import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wirePage, wireReview, wireUser } from './http-fixtures';
import { deferred } from './fixtures';
import { ServiceProvider } from '../src/services/ServiceProvider';
import { GameOpinionsSection } from '../src/pages/GameOpinionsSection';
import { CommentsSection } from '../src/pages/CommentsSection';

function body(path: string): unknown {
  if (path.endsWith('/auth/login')) return { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
  if (path.endsWith('/auth/me') || /^\/api\/v1\/users\/[^/]+$/.test(path)) return wireUser;
  if (path === '/api/v1/games') return wirePage();
  if (/^\/api\/v1\/games\/[^/]+$/.test(path)) return wireGame;
  if (path.endsWith('/opinions')) return { averageRating: null, reviews: [] };
  if (path.endsWith('/rating/me')) return { rating: null };
  if (path.endsWith('/reviews/me')) return { review: null };
  if (path.endsWith('/follow/me')) return { following: false };
  if (path === '/api/v1/favorites') return { games: [], reviews: [] };
  if (path.includes('/favorites/')) return { favorite: null };
  if (path.endsWith('/dashboard')) return { favorites: { games: [], reviews: [] }, feed: [] };
  if (/^\/api\/v1\/reviews\/[^/]+$/.test(path)) return wireReview;
  return [];
}
const gameRoute = `/jogos/${encodeURIComponent(wireGame.id)}`;
const profileRoute = `/perfil/${encodeURIComponent(wireUser.id)}`;
interface QueryCase { route: string; endpoint: string; region: string; authenticated?: boolean; action?: string; }
const cases: QueryCase[] = [
  { route: '/', endpoint: '/games', region: 'Jogos' },
  { route: gameRoute, endpoint: `/games/${encodeURIComponent(wireGame.id)}`, region: 'Informações do jogo' },
  { route: '/reviews/55', endpoint: '/reviews/55', region: 'Conteúdo da review' },
  { route: '/reviews/55', endpoint: `/reviews/${encodeURIComponent(wireReview.id)}/comments`, region: 'Comentários' },
  { route: profileRoute, endpoint: `/users/${encodeURIComponent(wireUser.id)}`, region: 'Informações do perfil' },
  { route: '/', endpoint: '/dashboard', region: 'Seu dashboard', authenticated: true },
  { route: '/', endpoint: '/feed/following', region: 'Feed de reviews', authenticated: true, action: 'Atualizar feed' },
  { route: profileRoute, endpoint: '/favorites', region: 'Favoritos', authenticated: true },
  { route: profileRoute, endpoint: `/users/${encodeURIComponent(wireUser.id)}/followers`, region: 'Conexões' },
  { route: '/comunidade', endpoint: '/community/reviews/recent', region: 'Reviews recentes' },
  { route: '/comunidade', endpoint: '/community/reviews/most-commented', region: 'Reviews mais comentadas', action: 'Mais comentadas' },
  { route: '/comunidade', endpoint: '/community/games/in-discussion', region: 'Jogos em discussão', action: 'Jogos em discussão' },
  { route: '/', endpoint: '/notifications', region: 'Dados de notificações', authenticated: true, action: 'Notificações' },
  { route: gameRoute, endpoint: `/games/${encodeURIComponent(wireGame.id)}/rating/me`, region: 'Nota pessoal', authenticated: true },
  { route: gameRoute, endpoint: `/games/${encodeURIComponent(wireGame.id)}/reviews/me`, region: 'Consulta da sua review', authenticated: true },
  { route: gameRoute, endpoint: `/favorites/game/${encodeURIComponent(wireGame.id)}`, region: 'Favorito pessoal', authenticated: true },
  { route: '/perfil/2', endpoint: '/users/2/follow/me', region: 'Relação pessoal', authenticated: true },
];
test.each(cases)('região $region anuncia pendência e não fica busy após resposta', async ({ route, endpoint, region, authenticated, action }) => {
  const pending = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url) => new URL(url).pathname === `/api/v1${endpoint}` ? (await pending.promise).clone() : Response.json(body(new URL(url).pathname)));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (authenticated) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[route]}><AppRoutes adapters={adapters} /></MemoryRouter>);
  if (action) await userEvent.setup().click(await screen.findByRole('button', { name: action }));
  const area = await screen.findByRole('region', { name: region });
  expect(area).toHaveAttribute('aria-busy', 'true');
  expect(area.querySelector('[role="status"]')).not.toBeNull();
  await act(async () => { pending.resolve(Response.json(body(`/api/v1${endpoint}`))); await pending.promise; });
  await waitFor(() => expect(screen.getByRole('region', { name: region })).toHaveAttribute('aria-busy', 'false'));
});
test('nova consulta de opiniões esconde resultado anterior antes de receber resposta', async () => {
  const pending = deferred<Response>();
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: async (url) => url.includes('/1/') ? Response.json({ averageRating: 4, reviews: [] }) : pending.promise });
  const view = render(<MemoryRouter><ServiceProvider value={adapters}><GameOpinionsSection gameId={1} /></ServiceProvider></MemoryRouter>);
  await screen.findByText('Nota média: 4 de 5');
  view.rerender(<MemoryRouter><ServiceProvider value={adapters}><GameOpinionsSection gameId={2} /></ServiceProvider></MemoryRouter>);
  expect(screen.queryByText('Nota média: 4 de 5')).not.toBeInTheDocument();
  expect(screen.getByText('Carregando avaliações…')).toBeVisible();
  await act(async () => { pending.resolve(Response.json({ averageRating: null, reviews: [] })); await pending.promise; });
  expect(await screen.findByText('Ainda sem avaliações.')).toBeVisible();
});
test('comentários: troca de alvo ignora resposta anterior e desmontagem ignora retorno pendente', async () => {
  const old = deferred<Response>(); const latest = deferred<Response>();
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: async (url) => url.includes('/antiga/') ? old.promise : latest.promise });
  const view = render(<MemoryRouter><ServiceProvider value={adapters}><CommentsSection reviewId={1} /></ServiceProvider></MemoryRouter>);
  view.rerender(<MemoryRouter><ServiceProvider value={adapters}><CommentsSection reviewId={2} /></ServiceProvider></MemoryRouter>);
  await act(async () => { old.resolve(Response.json([])); await old.promise; });
  expect(screen.getByRole('region', { name: 'Comentários' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByText('Nenhum comentário nesta review.')).not.toBeInTheDocument();
  view.unmount();
  await act(async () => { latest.resolve(Response.json([])); await latest.promise; });
  expect(screen.queryByRole('region', { name: 'Comentários' })).not.toBeInTheDocument();
});
test('atualização de reviews esconde lista/vazio anterior; média é independente', async () => {
  const pending = deferred<Response>();
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: async (url) => url.endsWith('/opinions') ? Response.json({ averageRating: 4, reviews: [] }) : pending.promise });
  const view = render(<MemoryRouter><ServiceProvider value={adapters}><GameOpinionsSection gameId={wireGame.id} /></ServiceProvider></MemoryRouter>);
  await screen.findByText('Nenhuma review publicada para este jogo.');
  view.rerender(<MemoryRouter><ServiceProvider value={adapters}><GameOpinionsSection gameId={wireGame.id} reviewsVersion={1} /></ServiceProvider></MemoryRouter>);
  expect(screen.getByText('Atualizando reviews…')).toBeVisible();
  expect(screen.queryByText('Nenhuma review publicada para este jogo.')).not.toBeInTheDocument();
  expect(screen.getByText('Nota média: 4 de 5')).toBeVisible();
  await act(async () => { pending.resolve(Response.json([wireReview])); await pending.promise; });
  expect(await screen.findByRole('link', { name: 'Review de Ana' })).toBeVisible();
});
test('falha ao consultar review própria oferece retry sem liberar publicação antes da consulta', async () => {
  let failure = true;
  const transport: FetchTransport = async (url) => {
    if (url.endsWith('/reviews/me') && failure) throw new TypeError('offline');
    return Response.json(body(new URL(url).pathname));
  };
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[gameRoute]}><AppRoutes adapters={adapters} /></MemoryRouter>);
  await screen.findByText('Não foi possível verificar sua review.');
  expect(screen.queryByLabelText('Sua review')).not.toBeInTheDocument();
  failure = false;
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByLabelText('Sua review')).toBeVisible();
});
