import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import type { ReviewResponse } from '../src/services/http/dtos';
import { deferred } from './fixtures';
import { wireGame, wireReview, wireUser, withAuthentication } from './http-fixtures';

async function openProfile(options: { reviews?: ReviewResponse[]; favorites?: FetchTransport; profileId?: number; visitor?: boolean } = {}) {
  let reviews = options.reviews ?? [];
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/favorites') return options.favorites ? options.favorites(url, init) : Response.json({ games: [wireGame], reviews });
    if (path === '/api/v1/favorites/review/55') {
      const favorite = { id: 'favorite-review', userId: wireUser.id, targetType: 'review', targetId: wireReview.id };
      if (init.method === 'GET') return Response.json({ favorite: reviews.length ? favorite : null });
      reviews = init.method === 'PUT' ? [wireReview] : [];
      return init.method === 'PUT' ? Response.json(favorite) : new Response(null, { status: 204 });
    }
    if (path === '/api/v1/reviews/55') return Response.json(wireReview);
    if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following') || path.endsWith('/comments')) return Response.json([]);
    return Response.json({ ...wireUser, id: options.profileId ?? wireUser.id });
  }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (!options.visitor) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[`/perfil/${options.profileId ?? wireUser.id}`]}>
    <AppRoutes adapters={adapters} /><Link to="/reviews/55">Abrir review de teste</Link>
  </MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ana', level: 2 });
  return { interaction: userEvent.setup(), transport };
}

test('perfil com reviews favoritas vazias não monta seção, título ou mensagem; jogos permanecem', async () => {
  await openProfile();
  const games = await screen.findByRole('region', { name: 'Jogos favoritos' });
  expect(within(games).getByRole('link', { name: wireGame.title })).toHaveAttribute('href', '/jogos/12');
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  expect(screen.queryByText('Nenhuma review favorita.')).not.toBeInTheDocument();
});

test.each([1, 2])('perfil mostra seção, conteúdo e links com %i reviews favoritas', async count => {
  const reviews = Array.from({ length: count }, (_, index) => ({ ...wireReview, id: index + 1, text: `Texto favorito ${index}` }));
  await openProfile({ reviews });
  const region = await screen.findByRole('region', { name: 'Reviews favoritas' });
  expect(within(region).getByRole('heading', { name: 'Reviews favoritas' })).toBeVisible();
  expect(within(region).getAllByRole('link')).toHaveLength(count);
  for (const [index, link] of within(region).getAllByRole('link').entries()) {
    expect(link).toHaveAttribute('href', `/reviews/${index + 1}`);
    expect(within(region).getByText(`Texto favorito ${index}`)).toBeVisible();
  }
});

test('loading e falha de favoritos permanecem reconhecíveis; retry vazio mantém jogos', async () => {
  const pending = deferred<Response>();
  const favorites = vi.fn<FetchTransport>().mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(Response.json({ games: [], reviews: [] }));
  const { interaction } = await openProfile({ favorites });
  expect(await screen.findByText('Carregando favoritos…')).toBeVisible();
  expect(screen.getByRole('region', { name: 'Favoritos' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  await act(async () => { pending.resolve(Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 })); });
  expect(await screen.findByText('Não foi possível carregar os favoritos.')).toBeVisible();
  expect(screen.queryByText('Nenhum jogo favorito.')).not.toBeInTheDocument();
  await interaction.click(within(screen.getByRole('region', { name: 'Favoritos' })).getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum jogo favorito.')).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  expect(favorites).toHaveBeenCalledTimes(2);
});

test('adicionar primeira e remover última review atualiza visibilidade ao retornar ao próprio perfil', async () => {
  const { interaction, transport } = await openProfile();
  await screen.findByRole('region', { name: 'Jogos favoritos' });
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('link', { name: 'Abrir review de teste' }));
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar review' }));
  await screen.findByRole('button', { name: 'Remover review dos favoritos' });
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  const region = await screen.findByRole('region', { name: 'Reviews favoritas' });
  await interaction.click(within(region).getByRole('link', { name: 'Review de Ana: Jogo HTTP' }));
  await interaction.click(await screen.findByRole('button', { name: 'Remover review dos favoritos' }));
  await screen.findByRole('button', { name: 'Favoritar review' });
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  expect(await screen.findByRole('region', { name: 'Jogos favoritos' })).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
  expect(screen.queryByText('Nenhuma review favorita.')).not.toBeInTheDocument();
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/favorites')).toHaveLength(3);
});

test.each([{ visitor: true }, { profileId: 2 }])('favoritos permanecem privados: %j', async options => {
  const { transport } = await openProfile({ ...options, reviews: [wireReview] });
  expect(screen.queryByRole('region', { name: 'Favoritos' })).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([url]) => new URL(url).pathname === '/api/v1/favorites')).toBe(false);
});
