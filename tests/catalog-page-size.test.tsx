import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import type { GamePageResponse } from '../src/services/http/dtos';
import { wireGame, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';

function pageFor(query: URLSearchParams, count = 1): GamePageResponse {
  const page = Number(query.get('page') ?? 1);
  return { items: Array.from({ length: count }, (_, index) => ({ ...wireGame, id: `igdb-${index}`, title: `Jogo ${index}` })), page, pageSize: Number(query.get('pageSize') ?? 20), hasNextPage: page < 3 };
}
async function open(authenticated = false, respond: (query: URLSearchParams) => Promise<Response> = async query => Response.json(pageFor(query))) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    const parsed = new URL(url);
    return parsed.pathname === '/api/v1/games' ? respond(parsed.searchParams) : Response.json([]);
  }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (authenticated) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  const queries = () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games').map(([url]) => Object.fromEntries(new URL(url).searchParams));
  return { interaction: userEvent.setup(), queries };
}

test.each([false, true])('catálogo autenticado=%s começa com 20 e envia as três opções ao HTTP', async authenticated => {
  const { interaction, queries } = await open(authenticated);
  await screen.findByRole('link', { name: 'Jogo 0' });
  expect(queries()[0]).toMatchObject({ page: '1', pageSize: '20' });
  const select = screen.getByRole('combobox', { name: 'Itens por página' });
  expect(select).toHaveValue('20');
  expect(Array.from(select.querySelectorAll('option')).map(option => option.value)).toEqual(['10', '20', '50']);
  for (const size of ['10', '20', '50']) {
    await interaction.selectOptions(select, size);
    await screen.findByText(`Exibindo 1 jogo · até ${size} por página`);
    expect(queries().at(-1)).toMatchObject({ page: '1', pageSize: size });
  }
});

test('trocar quantidade na página 3 volta à primeira e preserva busca aplicada e ordenação', async () => {
  const { interaction, queries } = await open();
  await screen.findByText('Página 1');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'a & b{Enter}');
  await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  await screen.findByText('Página 1');
  for (const page of [2, 3]) {
    await interaction.click(screen.getByRole('button', { name: 'Próxima' }));
    await screen.findByText(`Página ${page}`);
  }
  // Texto ainda não submetido não deve substituir o filtro aplicado.
  await interaction.type(screen.getByLabelText('Buscar jogos'), ' rascunho');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '50');
  await screen.findByText('Página 1');
  expect(queries().at(-1)).toEqual({ term: 'a & b', sort: 'name-desc', page: '1', pageSize: '50' });
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue('a & b rascunho');
  await interaction.click(screen.getByRole('button', { name: 'Próxima' }));
  await screen.findByText('Página 2');
  expect(queries().at(-1)).toMatchObject({ page: '2', pageSize: '50', term: 'a & b', sort: 'name-desc' });
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  await screen.findByText('Página 1');
  expect(queries().at(-1)).toEqual({ term: '', sort: 'name-desc', page: '1', pageSize: '50' });
});

test.each([0, 13])('página final com %s itens mostra contagem real e navegação do envelope', async count => {
  await open(false, async query => Response.json({ ...pageFor(query, count), page: 3, hasNextPage: false }));
  expect(await screen.findByText(`Exibindo ${count} jogos · até 20 por página`)).toBeVisible();
  expect(screen.getByText('Página 3')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  expect(screen.queryAllByRole('article')).toHaveLength(count);
});

test.each(['', '15', '10abc', 'NaN'])('seleção inválida %s não dispara consulta', async value => {
  const { queries } = await open();
  await screen.findByText('Página 1');
  const select = screen.getByLabelText('Itens por página');
  const option = document.createElement('option'); option.value = value; select.append(option);
  fireEvent.change(select, { target: { value } });
  expect(queries()).toHaveLength(1);
  expect(screen.getByText('Página 1')).toBeVisible();
});

test('quantidade mantém loading/erro/retry e descarta resposta da seleção anterior', async () => {
  const old = deferred<Response>(); const latest = deferred<Response>();
  let retry = false;
  const { interaction, queries } = await open(false, async query => query.get('pageSize') === '10' ? old.promise : query.get('pageSize') === '50' ? retry ? Response.json({ ...pageFor(query, 2), hasNextPage: false }) : latest.promise : Response.json(pageFor(query)));
  await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '10');
  const region = screen.getByRole('region', { name: 'Jogos' });
  expect(region).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByText(/Exibindo/)).not.toBeInTheDocument();
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '50');
  await act(async () => { old.resolve(Response.json(pageFor(new URLSearchParams('pageSize=10'), 10))); await old.promise; });
  expect(region).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  await act(async () => { latest.resolve(Response.json({ code: 'internal_error', message: 'Falha de teste.' }, { status: 500 })); await latest.promise; });
  await screen.findByRole('alert');
  expect(screen.queryByText(/Exibindo/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Itens por página')).toHaveValue('50');
  retry = true;
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Exibindo 2 jogos · até 50 por página');
  await waitFor(() => expect(region).toHaveAttribute('aria-busy', 'false'));
  expect(queries().at(-1)).toMatchObject({ page: '1', pageSize: '50' });
});
