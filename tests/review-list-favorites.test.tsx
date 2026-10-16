import { withFilterOptions } from './http-fixtures';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireUser, wireGame, wireReview, wirePage } from './http-fixtures';

async function open(path = '/comunidade', options: { visitor?: boolean; read?: FetchTransport; write?: FetchTransport } = {}) {
  let account = wireUser;
  let selected = new Set([55]);
  const author = path === '/perfil/1' ? wireUser : { ...wireUser, id: 2, displayName: 'Leo' };
  const reviews = [{ ...wireReview, userId: author.id, author }, { ...wireReview, id: 56, userId: 3, author: { ...wireReview.author, id: 3, displayName: 'Bia' }, text: '' }];
  const lists = () => ({ games: [wireGame], reviews: reviews.filter(review => selected.has(review.id)) });
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url, init) => {
    const endpoint = new URL(url).pathname;
    if (endpoint.endsWith('/auth/login')) return Response.json({ user: account, token: `test-${account.id}`, expiresAt: '2080-01-01T00:00:00Z' });
    if (endpoint.endsWith('/auth/me')) return Response.json(account);
    if (endpoint.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    if (endpoint === '/api/v1/games') return Response.json(wirePage());
    if (endpoint === '/api/v1/games/12') return Response.json(wireGame);
    if (endpoint.endsWith('/dashboard')) return Response.json({ favorites: lists(), feed: reviews });
    if (endpoint === '/api/v1/favorites') return options.read ? options.read(url, init) : Response.json(lists());
    if (endpoint.startsWith('/api/v1/favorites/review/')) {
      const id = Number(endpoint.split('/').at(-1));
      const selection = selected;
      if (init.method === 'GET') throw new Error('Não consultar favoritos por card');
      const result = options.write ? await options.write(url, init) : init.method === 'PUT' ? Response.json({ id: 91, userId: account.id, targetType: 'review', targetId: id }) : new Response(null, { status: 204 });
      if (result.ok) { if (init.method === 'PUT') selection.add(id); else selection.delete(id); }
      return result;
    }
    if (endpoint.includes('/favorites/')) return Response.json({ favorite: null });
    if (endpoint.endsWith('/rating/me')) return Response.json({ rating: null });
    if (endpoint.endsWith('/reviews/me')) return Response.json({ review: null });
    if (endpoint.endsWith('/opinions')) return Response.json({ averageRating: null, reviews });
    if (endpoint === '/api/v1/community/reviews/recent' || endpoint === '/api/v1/feed/following') return Response.json(reviews);
    if (endpoint.endsWith('/most-commented')) return Response.json(reviews.map(review => ({ review, commentCount: 1, lastCommentAt: wireReview.createdAt })));
    if (endpoint === '/api/v1/users/1' || endpoint === '/api/v1/users/2') return Response.json(author);
    if (endpoint.endsWith('/reviews')) return Response.json([reviews[0]]);
    if (endpoint.endsWith('/followers') || endpoint.endsWith('/following')) return Response.json([]);
    if (endpoint.endsWith('/follow/me')) return Response.json({ following: false });
    throw new Error(`Consulta inesperada: ${endpoint}`);
  });
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  if (!options.visitor) await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={services} /></MemoryRouter>);
  return { transport, interaction: userEvent.setup(), lists, author, switchAccount() { account = { ...wireUser, id: 4, displayName: 'Outra conta' }; selected = new Set(); } };
}

test.each(['/comunidade', '/', '/jogos/12', '/perfil/1', '/perfil/2'])('estrelas em %s compartilham estado confirmado sem GET por review', async path => {
  const { transport, author } = await open(path);
  const stars = await screen.findAllByRole('button', { name: `Remover review de ${author.displayName} dos favoritos` });
  for (const star of stars) { expect(star).toHaveAttribute('aria-pressed', 'true'); expect(star).toHaveTextContent('★'); }
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/favorites'))).toHaveLength(path === '/' ? 0 : 1);
  expect(transport.mock.calls.some(([url]) => url.includes('/favorites/review/'))).toBe(false);
  if (path === '/') expect(screen.queryByRole('region', { name: 'Jogos favoritos' })).not.toBeInTheDocument();
});

test('estrela de review sem descrição alterna sem navegação, duplo clique não duplica e só bloqueia o alvo', async () => {
  const pending = deferred<Response>();
  const { transport, interaction } = await open('/comunidade', { write: () => pending.promise });
  const star = await screen.findByRole('button', { name: 'Favoritar review de Bia' });
  expect(star).toHaveTextContent('☆'); expect(star).toHaveAttribute('aria-pressed', 'false');
  act(() => { fireEvent.click(star); fireEvent.click(star); });
  expect(star).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remover review de Leo dos favoritos' })).toBeEnabled();
  expect(transport.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(1);
  await act(async () => { pending.resolve(Response.json({ id: 92, userId: 1, targetType: 'review', targetId: 56 })); });
  expect(await screen.findByRole('button', { name: 'Remover review de Bia dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Comunidade', level: 1 })).toBeVisible();
  expect(transport.mock.calls.some(([url]) => new URL(url).pathname === '/api/v1/reviews/56')).toBe(false);
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  expect(await screen.findByRole('button', { name: 'Remover review de Bia dos favoritos' })).toBeVisible();
});

test('erro de escrita mantém estrela confirmada e permite retry', async () => {
  const write = vi.fn<FetchTransport>().mockImplementationOnce(async () => Response.json({ code: 'http_error', message: 'Falha' }, { status: 500 }))
    .mockImplementation(async () => new Response(null, { status: 204 }));
  const { interaction } = await open('/comunidade', { write });
  await interaction.click(await screen.findByRole('button', { name: 'Remover review de Leo dos favoritos' }));
  expect(await screen.findByText('Não foi possível atualizar o favorito. Tente novamente.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Remover review de Leo dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
  await interaction.click(screen.getByRole('button', { name: 'Remover review de Leo dos favoritos' }));
  expect(await screen.findByRole('button', { name: 'Favoritar review de Leo' })).toHaveAttribute('aria-pressed', 'false');
});

test('leitura pendente não inventa seleção; falha oferece retry compartilhado', async () => {
  const pending = deferred<Response>();
  const read = vi.fn<FetchTransport>().mockReturnValueOnce(pending.promise).mockImplementation(async () => Response.json({ games: [], reviews: [] }));
  const { interaction } = await open('/comunidade', { read });
  const loading = await screen.findAllByRole('button', { name: /Carregando favorito/ });
  expect(loading).toHaveLength(2);
  for (const button of loading) { expect(button).toBeDisabled(); expect(button).not.toHaveAttribute('aria-pressed'); }
  expect(read).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(Response.json({ code: 'http_error', message: 'Falha' }, { status: 500 })); });
  await interaction.click((await screen.findAllByRole('button', { name: /Tentar novamente favoritos/ }))[0]);
  expect(await screen.findByRole('button', { name: 'Favoritar review de Leo' })).toHaveAttribute('aria-pressed', 'false');
  expect(read).toHaveBeenCalledTimes(2);
});

test('remover última favorita sincroniza duas instâncias e revalida para ocultar seção do perfil', async () => {
  const pending = deferred<Response>();
  const { interaction, transport } = await open('/perfil/1', { write: () => pending.promise });
  const stars = await screen.findAllByRole('button', { name: 'Remover review de Ana dos favoritos' });
  expect(stars).toHaveLength(2);
  await interaction.click(stars[0]);
  for (const star of stars) expect(star).toBeDisabled();
  await act(async () => { pending.resolve(new Response(null, { status: 204 })); });
  expect(await screen.findByRole('button', { name: 'Favoritar review de Ana' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Jogos favoritos' })).toBeVisible();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/favorites'))).toHaveLength(2);
});

test('visitante recebe convite para entrar, sem leitura privada ou escrita', async () => {
  const { transport, interaction } = await open('/comunidade', { visitor: true });
  const invitation = await screen.findByRole('link', { name: 'Entrar para favoritar review de Leo' });
  expect(transport.mock.calls.some(([url]) => url.includes('/favorites'))).toBe(false);
  await interaction.click(invitation);
  expect(await screen.findByRole('form', { name: 'Login' })).toBeVisible();
  expect(transport.mock.calls.some(([, init]) => init.method !== 'GET')).toBe(false);
});

test('resposta de favorito de sessão antiga não altera estrelas de outro usuário', async () => {
  const pending = deferred<Response>();
  const { interaction, switchAccount } = await open('/comunidade', { write: () => pending.promise });
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar review de Bia' }));
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  switchAccount();
  await interaction.click(screen.getByRole('link', { name: 'Entrar' }));
  await interaction.type(screen.getByLabelText('E-mail'), 'other@example.test');
  await interaction.type(screen.getByLabelText('Senha'), 'test-only');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('button', { name: 'Favoritar review de Bia' })).toHaveAttribute('aria-pressed', 'false');
  await act(async () => { pending.resolve(Response.json({ id: 92, userId: 1, targetType: 'review', targetId: 56 })); });
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Outra conta');
  expect(screen.getByRole('button', { name: 'Favoritar review de Bia' })).toHaveAttribute('aria-pressed', 'false');
});
