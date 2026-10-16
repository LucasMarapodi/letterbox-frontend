import { withFilterOptions } from './http-fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeFavorite, unwrapFavorite } from '../src/services/http/decoders';
import type { FetchTransport } from '../src/services/http/client';
import { wireFavorite, wireGame, wireReview, wireUser, withAuthentication } from './http-fixtures';

test.each(['game', 'review'] as const)('P-PR-05: favorito %s aceita ID e alvo numéricos, inclusive limite int32', targetType => {
  const value = { ...wireFavorite, id: 91, targetId: targetType === 'game' ? 12 : 55, targetType };
  expect(decodeFavorite(value)).toEqual(value);
  expect(unwrapFavorite({ favorite: value })).toEqual(value);
  expect(decodeFavorite({ ...value, id: 2_147_483_647, targetId: 2_147_483_647 })).toMatchObject({ id: 2_147_483_647, targetId: 2_147_483_647 });
  expect(unwrapFavorite({ favorite: null })).toBeNull();
});

test.each([0, -1, 1.5, 2_147_483_648, NaN, Infinity, '91', null, undefined, true])('Favorite.id inválido %j é rejeitado', id => {
  expect(() => decodeFavorite({ ...wireFavorite, id, targetId: 12 })).toThrow();
});

test.each([0, -1, 1.5, 2_147_483_648, NaN, Infinity, '12', '55', '01', null, undefined, true])('Favorite.targetId inválido %j não é convertido', targetId => {
  for (const targetType of ['game', 'review']) expect(() => decodeFavorite({ ...wireFavorite, id: 91, targetType, targetId })).toThrow();
});

test.each(['game', 'review'] as const)('favoritar e remover %s com resposta numérica atualiza botão e listas do perfil', async kind => {
  let selected = false;
  const target = kind === 'game' ? wireGame.id : wireReview.id;
  const favorite = { ...wireFavorite, id: 91, targetType: kind, targetId: target };
  const endpoint = `/api/v1/favorites/${kind}/${target}`;
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if (path === endpoint) {
      if (init.method === 'GET') return Response.json({ favorite: selected ? favorite : null });
      selected = init.method === 'PUT';
      return selected ? Response.json(favorite) : new Response(null, { status: 204 });
    }
    if (path === '/api/v1/favorites') return Response.json({ games: selected && kind === 'game' ? [wireGame] : [], reviews: selected && kind === 'review' ? [wireReview] : [] });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path === '/api/v1/games/12') return Response.json(wireGame);
    if (path === '/api/v1/reviews/55') return Response.json(wireReview);
    if (path === '/api/v1/users/1') return Response.json(wireUser);
    if (path.endsWith('/opinions')) return Response.json({ averageRating: null, reviews: [] });
    if (path.endsWith('/rating/me')) return Response.json({ rating: null });
    if (path.endsWith('/reviews/me')) return Response.json({ review: null });
    if (path.endsWith('/reviews') || path.endsWith('/comments') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
    throw new Error(`Consulta inesperada: ${path}`);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[kind === 'game' ? '/jogos/12' : '/reviews/55']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const label = kind === 'game' ? 'jogo' : 'review';
  await interaction.click(await screen.findByRole('button', { name: `Favoritar ${label}` }));
  expect(await screen.findByRole('button', { name: `Remover ${label} dos favoritos` })).toHaveAttribute('aria-pressed', 'true');
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  const region = await screen.findByRole('region', { name: kind === 'game' ? 'Jogos favoritos' : 'Reviews favoritas' });
  await interaction.click(within(region).getByRole('link', { name: kind === 'game' ? wireGame.title : 'Review de Ana: Jogo HTTP' }));
  await interaction.click(await screen.findByRole('button', { name: `Remover ${label} dos favoritos` }));
  expect(await screen.findByRole('button', { name: `Favoritar ${label}` })).toHaveAttribute('aria-pressed', 'false');
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  expect(await screen.findByText('Nenhum jogo favorito.')).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  const writes = transport.mock.calls.filter(([url, init]) => new URL(url).pathname === endpoint && init.method !== 'GET');
  expect(writes.map(([, init]) => init.method)).toEqual(['PUT', 'DELETE']);
  expect(writes.every(([, init]) => init.body === undefined)).toBe(true);
});
