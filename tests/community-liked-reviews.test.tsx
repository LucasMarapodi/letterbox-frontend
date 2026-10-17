import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireReview, withFilterOptions } from './http-fixtures';

test('Mais curtidas consulta reviews publicamente, mostra conteúdo e pagina/reset por período', async () => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async url => {
    if (url.includes('/reviews/most-liked')) {
      const q = new URL(url).searchParams;
      return Response.json({ items: [{ review: { ...wireReview, title: 'Review com duas curtidas', likeCount: 2 }, periodLikeCount: 2, lastLikeAt: '2026-10-17T12:00:00Z' }],
        page: Number(q.get('page')), pageSize: Number(q.get('pageSize')), hasNextPage: q.get('page') === '1' });
    }
    return Response.json([]);
  });
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport) });
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={services} /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Mais curtidas', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Reviews mais curtidas' })).toBeVisible();
  expect(await screen.findByText('Review com duas curtidas')).toBeVisible();
  expect(screen.getByText('2 curtidas no período')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo HTTP' })).toHaveAttribute('href', '/jogos/12');
  const calls = () => transport.mock.calls.filter(([url]) => url.includes('/reviews/most-liked'));
  expect(Object.fromEntries(new URL(calls()[0][0]).searchParams)).toEqual({ period: '7d', page: '1', pageSize: '20' });
  expect(calls()[0][1].headers).not.toHaveProperty('Authorization');
  expect(transport.mock.calls.some(([url]) => url.includes('/comments/most-liked'))).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(await screen.findByText('Página 2')).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Período dos rankings'), '24h');
  expect(await screen.findByText('Página 1')).toBeVisible();
  expect(new URL(calls().at(-1)![0]).searchParams.get('period')).toBe('24h');
});
