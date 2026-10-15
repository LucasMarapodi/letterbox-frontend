import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeReview, decodeRating, decodeComment, decodeNotification, decodeFavorite, decodeDashboard } from '../src/services/http/decoders';
import type { FetchTransport } from '../src/services/http/client';
import { wireReview, wireRating, wireComment, wireNotification, wireFavorite, wireGame, wireUser, withAuthentication } from './http-fixtures';

const review = { ...wireReview, id: 55 };
const rating = { ...wireRating, id: 77 };

test('P-PR-03 decodifica reviews, notas, comentários, notificações e dashboard com referências numéricas', () => {
  expect(decodeReview(review).id).toBe(55);
  expect(decodeRating(rating).id).toBe(77);
  expect(decodeComment({ ...wireComment, reviewId: 55 })).toMatchObject({ id: wireComment.id, reviewId: 55 });
  expect(decodeNotification({ ...wireNotification, reviewId: 55 })).toMatchObject({ id: wireNotification.id, reviewId: 55 });
  expect(decodeDashboard({ favorites: { games: [], reviews: [review] }, feed: [review] }).feed[0].id).toBe(55);
});

test.each([0, -1, 1.5, 2_147_483_648, '55', 'review-55'])('rejeita ID de review/nota e referências inválidos: %j', id => {
  expect(() => decodeReview({ ...review, id })).toThrow();
  expect(() => decodeRating({ ...rating, id })).toThrow();
  expect(() => decodeComment({ ...wireComment, reviewId: id })).toThrow();
  expect(() => decodeNotification({ ...wireNotification, reviewId: id })).toThrow();
});

test('favorito preserva ID próprio e alvo numéricos da review', () => {
  expect(decodeFavorite({ ...wireFavorite, targetType: 'review', targetId: 55 })).toMatchObject({ id: wireFavorite.id, targetId: 55 });
});

test.each(['0', '-1', '1.5', '01', '1e2', '2147483648', 'review-55', 'game%2F42'])('rota de review inválida %s não consulta a API', id => {
  const transport = vi.fn<FetchTransport>().mockRejectedValue(new Error('Não deveria consultar'));
  render(<MemoryRouter initialEntries={[`/reviews/${encodeURIComponent(id)}`]}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport })} /></MemoryRouter>);
  expect(screen.getByText('Review não encontrada.')).toBeVisible();
  expect(transport).not.toHaveBeenCalled();
});

test('respostas numéricas de nota, publicação e edição são aceitas; favorito consulta ID local', async () => {
  let saved = false;
  let text = 'Review numérica';
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/games/12') return Response.json(wireGame);
    if (path.endsWith('/rating/me')) return Response.json(init.method === 'PUT' ? { ...rating, value: 5 } : { rating: null });
    if (path.endsWith('/reviews/me')) return Response.json({ review: saved ? { ...review, text } : null });
    if (path === '/api/v1/games/12/reviews' && init.method === 'POST') { saved = true; return Response.json({ ...review, text }); }
    if (path.endsWith('/opinions')) return Response.json({ averageRating: null, reviews: [] });
    if (path === '/api/v1/reviews/55') {
      if (init.method === 'PATCH') text = 'Review editada';
      return Response.json({ ...review, text });
    }
    if (path === '/api/v1/favorites/review/55') return Response.json({ favorite: { ...wireFavorite, targetType: 'review', targetId: 55 } });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path.endsWith('/comments')) return Response.json([]);
    throw new Error(`Consulta inesperada: ${path}`);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/jogos/12']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  await interaction.click(await screen.findByRole('radio', { name: '5 estrelas' }));
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByText('Nota 5 salva.')).toBeVisible();
  await interaction.type(await screen.findByLabelText('Sua review'), 'Review numérica');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(await screen.findByText('Review publicada.')).toBeVisible();
  await interaction.click(await screen.findByRole('link', { name: 'Editar minha review' }));
  expect(await screen.findByRole('button', { name: 'Remover review dos favoritos' })).toBeVisible();
  await interaction.clear(await screen.findByLabelText('Sua review'));
  await interaction.type(screen.getByLabelText('Sua review'), 'Review editada');
  await interaction.click(screen.getByRole('button', { name: 'Salvar review' }));
  expect(await screen.findByText('Review atualizada.')).toBeVisible();
  expect(services.auth.sessionUser?.()?.id).toBe(wireUser.id);
  expect(transport.mock.calls.some(([url]) => url.endsWith('/reviews/55'))).toBe(true);
});
