import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireReview, withAuthentication } from './http-fixtures';

test.each([
  ['Recentes', 'Reviews recentes', '/community/reviews/recent'],
  ['Mais comentadas', 'Reviews mais comentadas', '/community/reviews/most-commented'],
  ['Jogos em discussão', 'Jogos em discussão', '/community/games/in-discussion'],
  ['Feed de reviews', 'Feed de reviews', '/feed/following'],
])('%s exibe conteúdo sem aviso de catálogo mesmo com metadados stale', async (tab, region, endpoint) => {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    const path = new URL(url).pathname;
    const body = path.endsWith('/favorites') ? { games: [], reviews: [] }
      : path.endsWith('/like/me') ? { likedByMe: false }
      : path.endsWith('/most-commented') ? [{ review: wireReview, commentCount: 2, lastCommentAt: wireReview.createdAt }]
      : path.endsWith('/in-discussion') ? [{ game: wireGame, commentCount: 2, lastCommentAt: wireReview.createdAt }]
      : path.endsWith('/recent') || path.endsWith('/feed/following') ? [wireReview] : [];
    return Response.json(body, { headers: { 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': '2026-10-16T12:00:00Z' } });
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await services.auth.login({ email: 'community@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={services} /></MemoryRouter>);
  if (tab !== 'Recentes') await userEvent.click(screen.getByRole('button', { name: tab }));
  const area = screen.getByRole('region', { name: region });
  await within(area).findByRole('link', { name: wireGame.title });
  expect(screen.queryByRole('complementary', { name: 'Atualização do catálogo' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Dados do catálogo desatualizados/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Consultar novamente' })).not.toBeInTheDocument();
  expect(transport.mock.calls.filter(([url]) => new URL(url).pathname === `/api/v1${endpoint}`)).toHaveLength(1);
});
