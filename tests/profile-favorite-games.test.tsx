import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { GameCard } from '../src/components/GameCard';
import type { Game } from '../src/models';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireUser, withAuthentication } from './http-fixtures';

async function open(games: Game[]) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/users/1') return Response.json(wireUser);
    if (path === '/api/v1/favorites') return Response.json({ games, reviews: [] });
    if (path === '/api/v1/games/12') return Response.json(games[0]);
    if (path.endsWith('/opinions')) return Response.json({ averageRating: null, reviews: [] });
    if (path.endsWith('/rating/me')) return Response.json({ rating: null });
    if (path.endsWith('/reviews/me')) return Response.json({ review: null });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
    throw new Error(`Consulta inesperada: ${path}`);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/perfil/1']}><AppRoutes adapters={services} /></MemoryRouter>);
  const region = await screen.findByRole('region', { name: 'Jogos favoritos' });
  return { region, transport, interaction: userEvent.setup() };
}

test('jogos favoritos são itens de lista com nome, capa e resumo retornado pela API, sem consultas individuais', async () => {
  const games = [{ ...wireGame, coverUrl: '/capa.svg', summary: 'Uma aventura para explorar.' }, { ...wireGame, id: 13, title: 'Outro jogo', summary: '<strong>Texto literal</strong>' }];
  const { region, transport } = await open(games);
  const list = within(region).getByRole('list', { name: 'Jogos favoritos' });
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByRole('img', { name: `Capa de ${wireGame.title}` })).toHaveAttribute('src', '/capa.svg');
  expect(within(items[0]).getByRole('link', { name: wireGame.title })).toHaveAttribute('href', '/jogos/12');
  expect(within(items[0]).getByText(games[0].summary)).toBeVisible();
  expect(within(items[1]).getByRole('link', { name: 'Outro jogo' })).toHaveAttribute('href', '/jogos/13');
  expect(within(items[1]).getByText(games[1].summary)).toBeVisible();
  expect(items[1].querySelector('strong')).toBeNull();
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/favorites')).toHaveLength(1);
  expect(transport.mock.calls.some(([url]) => new URL(url).pathname.startsWith('/api/v1/games/'))).toBe(false);
});

test.each(['', '  \n  '])('resumo vazio %j e capa ausente apresentam fallbacks na linha', async summary => {
  const { region } = await open([{ ...wireGame, summary, coverUrl: null }]);
  const item = within(region).getByRole('listitem');
  expect(within(item).getByText('Resumo não informado.')).toBeVisible();
  expect(within(item).getByRole('img', { name: `Capa de ${wireGame.title} indisponível` })).toHaveTextContent('Sem capa');
});

test('erro na URL da capa reutiliza fallback; nome da linha navega por teclado', async () => {
  const { region, interaction, transport } = await open([{ ...wireGame, summary: 'Resumo do favorito', coverUrl: '/invalida.png' }]);
  fireEvent.error(within(region).getByRole('img', { name: `Capa de ${wireGame.title}` }));
  expect(within(region).getByRole('img', { name: `Capa de ${wireGame.title} indisponível` })).toHaveTextContent('Sem capa');
  const link = within(region).getByRole('link', { name: wireGame.title });
  link.focus(); await interaction.keyboard('{Enter}');
  expect(await screen.findByRole('heading', { name: wireGame.title, level: 2 })).toBeVisible();
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games/12')).toHaveLength(1);
});

test('GameCard fora do perfil continua com a apresentação atual', () => {
  render(<MemoryRouter><GameCard game={{ ...wireGame, summary: 'Resumo exclusivo da linha de favoritos' }} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: wireGame.title })).toHaveAttribute('href', '/jogos/12');
  expect(screen.queryByText('Resumo exclusivo da linha de favoritos')).not.toBeInTheDocument();
});
