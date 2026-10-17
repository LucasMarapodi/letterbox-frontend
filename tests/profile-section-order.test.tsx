import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireReview, wireUser, withAuthentication, withFilterOptions } from './http-fixtures';

async function open(guest = false, failure = false) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/users/1') return Response.json(wireUser);
    if (path === '/api/v1/users/1/reviews') return Response.json([wireReview, { ...wireReview, id: 56 }, { ...wireReview, id: 57 }]);
    if (path.endsWith('/favorites')) return failure ? Response.json({ code: 'storage_unavailable', message: 'Erro' }, { status: 503 }) : Response.json({ games: [wireGame], reviews: [wireReview] });
    if (path.endsWith('/like/me')) return Response.json({ likedByMe: false });
    return Response.json([]);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport) });
  if (!guest) await services.auth.login({ email: 'profile@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/perfil/1']}><AppRoutes adapters={services} /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ana', level: 2 });
  return transport;
}

test('perfil → jogos favoritos → Minhas reviews → reviews favoritas; uma consulta compartilhada', async () => {
  const transport = await open();
  const games = await screen.findByRole('region', { name: 'Jogos favoritos' });
  const authored = screen.getByRole('region', { name: 'Reviews do usuário' });
  const favorites = screen.getByRole('region', { name: 'Reviews favoritas' });
  expect(within(authored).getByRole('heading', { name: 'Minhas reviews' })).toBeVisible();
  expect(within(authored).getByText('3 reviews')).toBeVisible();
  expect(screen.getByRole('region', { name: 'Informações do perfil' }).compareDocumentPosition(games) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(games.compareDocumentPosition(authored) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(authored.compareDocumentPosition(favorites) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/favorites'))).toHaveLength(1);
});

test('visitante não vê favoritos privados nem Minhas reviews', async () => {
  const transport = await open(true);
  expect(within(screen.getByRole('region', { name: 'Reviews do usuário' })).getByRole('heading', { name: 'Reviews' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Minhas reviews' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Jogos favoritos' })).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([url]) => url.endsWith('/favorites'))).toBe(false);
});

test('falha de favoritos não oculta reviews próprias e apresenta um único retry', async () => {
  await open(false, true);
  expect(await screen.findByText('Não foi possível carregar os favoritos.')).toBeVisible();
  expect(screen.getAllByText('Não foi possível carregar os favoritos.')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Minhas reviews' })).toBeVisible();
  expect(within(screen.getByRole('region', { name: 'Reviews do usuário' })).getAllByRole('article')).toHaveLength(2);
});
