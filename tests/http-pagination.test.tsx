import { withFilterOptions } from './http-fixtures';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices, createHttpAdapters } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame } from './http-fixtures';
import { deferred } from './fixtures';

const page = (number = 1, hasNextPage = false, title = 'Página real') => ({ items: [{ ...wireGame, id: 42, title }], page: number, pageSize: 20, hasNextPage });
function mount(transport: FetchTransport): void {
  render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)})} /></MemoryRouter>);
}
test('adaptador decodifica envelope e rejeita array antigo e paginação inválida', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(page())).mockResolvedValueOnce(Response.json([wireGame])).mockResolvedValueOnce(Response.json({ ...page(), page: 0 }));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  expect(await adapters.games.list()).toEqual(page());
  await expect(adapters.games.list()).rejects.toMatchObject({ kind: 'contract' });
  await expect(adapters.games.list()).rejects.toMatchObject({ kind: 'contract' });
});
test('Home recente, próximo/anterior, filtro e ordenação resetam página; ID é preservado', async () => {
  const user = userEvent.setup();
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url) => {
    const uri = new URL(url);
    if (uri.pathname !== '/api/v1/games') return Response.json({ ...wireGame, id: 42 });
    const number = Number(uri.searchParams.get('page') ?? 1);
    return Response.json(page(number, number === 1, `Jogo ${number}`));
  });
  mount(transport);
  expect(await screen.findByRole('link', { name: 'Jogo 1' })).toHaveAttribute('href', '/jogos/42');
  expect(screen.getByLabelText('Ordenar por')).toHaveValue('release-desc');
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(await screen.findByText('Página 2')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Anterior' }));
  await screen.findByText('Página 1');
  await user.click(screen.getByRole('button', { name: 'Próxima' }));
  await screen.findByText('Página 2');
  await user.type(screen.getByLabelText('Buscar jogos'), 'a & b{Enter}');
  await screen.findByText('Página 1');
  await user.click(screen.getByRole('button', { name: 'Próxima' }));
  await screen.findByText('Página 2');
  await user.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await screen.findByText('Página 1');
  const urls = transport.mock.calls.map(([url]) => new URL(url));
  expect(urls[0].searchParams.get('sort')).toBe('release-desc');
  expect(urls.some((url) => url.searchParams.get('page') === '2')).toBe(true);
  expect(urls.at(-1)?.searchParams.get('page')).toBe('1');
  expect(urls.at(-1)?.searchParams.get('term')).toBe('a & b');
  for (const [, init] of transport.mock.calls) expect(init.headers).not.toHaveProperty('Authorization');
});
test('resposta antiga não substitui busca nova e vazio continua paginado', async () => {
  const pending = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(Response.json({ items: [], page: 1, pageSize: 20, hasNextPage: false }));
  mount(transport);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Buscar jogos'), 'novo{Enter}');
  expect(await screen.findByText('Nenhum jogo encontrado para esta busca.')).toBeVisible();
  await act(async () => { pending.resolve(Response.json(page(1, true, 'Obsoleto'))); await pending.promise; });
  expect(screen.queryByRole('link', { name: 'Obsoleto' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
});
