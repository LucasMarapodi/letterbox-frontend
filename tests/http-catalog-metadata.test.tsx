import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wirePage, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';
const headers = { 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': '2026-10-14T10:00:00Z' };
function mount(transport: FetchTransport, path = '/'): void {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport })} /></MemoryRouter>);
}
test('stale confirmado mostra data e retry usa mesma consulta sem request adicional', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(wirePage([wireGame]), { headers })).mockResolvedValueOnce(Response.json(wirePage([wireGame]), { headers: { ...headers, 'X-Catalog-Stale': 'false' } }));
  mount(transport);
  expect(await screen.findByText(/Dados do catálogo desatualizados/)).toBeVisible();
  expect(screen.getByText(/14\/10\/2026/)).toBeVisible();
  expect(transport).toHaveBeenCalledTimes(1);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Consultar novamente' }));
  await screen.findByRole('link', { name: wireGame.title });
  expect(screen.queryByText(/Dados do catálogo desatualizados/)).not.toBeInTheDocument();
  expect(transport).toHaveBeenCalledTimes(2);
});
test.each([{}, { 'X-Catalog-Stale': 'false' }, { 'X-Catalog-Stale': 'invalid' }])('headers sem stale confirmado não inventam aviso: %j', async (metadata) => {
  mount(async () => Response.json(wirePage([wireGame]), { headers: metadata }));
  await screen.findByRole('link', { name: wireGame.title });
  expect(screen.queryByText(/Dados do catálogo desatualizados/)).not.toBeInTheDocument();
});
test('detalhe propaga metadata sem contaminar Game e sem chamada para headers', async () => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url) => Response.json(url.endsWith('/opinions') ? { averageRating: null, reviews: [] } : wireGame, { headers }));
  mount(transport, '/jogos/game%252F42');
  await screen.findByRole('heading', { name: wireGame.title });
  expect(await screen.findByText(/Dados do catálogo desatualizados/)).toBeVisible();
  expect(transport).toHaveBeenCalledTimes(2);
});
test('headers tardios de busca antiga não mudam freshness da página nova', async () => {
  const pending = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(Response.json(wirePage([wireGame])));
  mount(transport);
  await userEvent.setup().type(screen.getByLabelText('Buscar jogos'), 'nova{Enter}');
  await screen.findByRole('link', { name: wireGame.title });
  await act(async () => { pending.resolve(Response.json(wirePage([wireGame]), { headers })); await pending.promise; });
  expect(screen.queryByText(/Dados do catálogo desatualizados/)).not.toBeInTheDocument();
});
test.each([502, 503, 504])('falha de integração %s mantém sessão e oferece retry', async (status) => {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url) => {
    if (new URL(url).pathname === '/api/v1/games') return Response.json({ code: 'http_error', message: 'Seguro' }, { status });
    throw new Error('Request extra inesperado');
  }));
  mount(transport, '/login');
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), 'test@example.test'); await user.type(screen.getByLabelText('Senha'), 'test-only');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('O catálogo está temporariamente indisponível. Tente novamente.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Meu perfil' })).toBeVisible();
  const count = transport.mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('O catálogo está temporariamente indisponível. Tente novamente.');
  expect(transport.mock.calls.length).toBe(count + 1);
  expect(screen.getByRole('link', { name: 'Meu perfil' })).toBeVisible();
});
