import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireGame, withAuthentication } from './http-fixtures';
import { decodeCatalogFilters } from '../src/services/http/decoders';

const options = { genres: [{ id: 31, name: 'Aventura da API' }], platforms: [{ id: 42, name: 'Plataforma da API' }] };
function result(query: URLSearchParams, title = 'Jogo retornado') { return Response.json({ items: [{ ...wireGame, title }], page: Number(query.get('page') ?? 1), pageSize: Number(query.get('pageSize') ?? 20), hasNextPage: true }); }
async function open(authenticated = false, respond: FetchTransport = async url => new URL(url).pathname.endsWith('/filters') ? Response.json(options) : result(new URL(url).searchParams)) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(respond));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (authenticated) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Jogo retornado' });
  return { interaction: userEvent.setup(), calls: () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games'), filterCalls: () => transport.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/filters')) };
}

test.each([false, true])('autenticado=%s: opções HTTP, rascunho sem consulta e aplicação combinada de filtros', async authenticated => {
  const { interaction, calls, filterCalls } = await open(authenticated);
  await screen.findByRole('option', { name: 'Aventura da API' });
  await interaction.type(screen.getByLabelText('Buscar jogos'), '  a & b  ');
  await interaction.selectOptions(screen.getByLabelText('Gênero'), '31');
  await interaction.selectOptions(screen.getByLabelText('Plataforma'), '42');
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  expect(calls()).toHaveLength(1);
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(calls()).toHaveLength(2));
  expect(Object.fromEntries(new URL(calls()[1][0]).searchParams)).toEqual({ term: 'a & b', sort: 'name-desc', genreId: '31', platformId: '42', page: '1', pageSize: '20' });
  expect(screen.queryByLabelText('Filtros aplicados')).not.toBeInTheDocument();
  expect(filterCalls()).toHaveLength(1);
  expect(filterCalls()[0][1].headers).not.toHaveProperty('Authorization');
});

test('Últimos lançados combina nome e dimensões, reinicia página e mantém tamanho; limpar restaura Todos', async () => {
  const { interaction, calls } = await open();
  await screen.findByRole('option', { name: 'Aventura da API' });
  expect(screen.getByRole('option', { name: 'Últimos lançados' })).toHaveValue('release-desc');
  expect(screen.getByText(/primeira data de lançamento/)).toBeVisible();
  expect(screen.getByText('29/02/2024')).toHaveAttribute('dateTime', '2024-02-29');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '50');
  await screen.findByText(/até 50 por página/);
  await interaction.click(screen.getByRole('button', { name: 'Próxima' })); await screen.findByText('Página 2');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'mario');
  await interaction.selectOptions(screen.getByLabelText('Gênero'), '31');
  await interaction.selectOptions(screen.getByLabelText('Plataforma'), '42');
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' })); await screen.findByText('Página 1');
  expect(Object.fromEntries(new URL(calls().at(-1)![0]).searchParams)).toEqual({ term: 'mario', sort: 'release-desc', genreId: '31', platformId: '42', page: '1', pageSize: '50' });
  await interaction.click(screen.getByRole('button', { name: 'Próxima' })); await screen.findByText('Página 2');
  expect(new URL(calls().at(-1)![0]).searchParams.get('genreId')).toBe('31');
  await interaction.click(screen.getByRole('button', { name: 'Limpar filtros' })); await screen.findByText('Página 1');
  expect(Object.fromEntries(new URL(calls().at(-1)![0]).searchParams)).toEqual({ term: '', sort: 'release-desc', page: '1', pageSize: '50' });
  expect(screen.getByLabelText('Gênero')).toHaveValue(''); expect(screen.getByLabelText('Plataforma')).toHaveValue('');
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue('');
});

test('opções carregam/falham separadamente do catálogo e retry não reconsulta jogos', async () => {
  const pending = deferred<Response>(); let retry = false;
  const { interaction, calls, filterCalls } = await open(false, async url => new URL(url).pathname.endsWith('/filters') ? retry ? Response.json(options) : pending.promise : result(new URL(url).searchParams));
  expect(screen.getByText('Carregando opções de filtro…')).toBeVisible();
  expect(screen.getByLabelText('Gênero')).toBeDisabled();
  await act(async () => { pending.resolve(Response.json({ code: 'integration_timeout', message: 'Falha sintética' }, { status: 503 })); await pending.promise; });
  expect(await screen.findByText('Não foi possível carregar as opções de filtro.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo retornado' })).toBeVisible();
  retry = true;
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente opções' }));
  await screen.findByRole('option', { name: 'Aventura da API' });
  expect(filterCalls()).toHaveLength(2); expect(calls()).toHaveLength(1);
});

test('aplicar preserva cards e bloqueia; erro não apresenta a combinação anterior como atualizada', async () => {
  const pending = deferred<Response>(); let hold = false;
  const { interaction, calls } = await open(false, async url => new URL(url).pathname.endsWith('/filters') ? Response.json(options) : hold ? pending.promise : result(new URL(url).searchParams));
  await screen.findByRole('option', { name: 'Aventura da API' });
  await interaction.selectOptions(screen.getByLabelText('Gênero'), '31'); hold = true;
  await interaction.dblClick(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  expect(screen.getByText('Jogo retornado')).toBeInTheDocument(); expect(calls()).toHaveLength(2);
  await act(async () => { pending.resolve(Response.json({ code: 'invalid_filter', message: 'Filtro indisponível' }, { status: 400 })); await pending.promise; });
  expect(await screen.findByRole('alert')).toHaveTextContent('Filtro indisponível');
  expect(screen.queryByRole('link', { name: 'Jogo retornado' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('mesmo conjunto e limpar somente rascunho não geram consulta; tamanho não aplica rascunho', async () => {
  const { interaction, calls } = await open();
  await screen.findByRole('option', { name: 'Aventura da API' });
  await interaction.selectOptions(screen.getByLabelText('Gênero'), '31');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '10'); await screen.findByText(/até 10 por página/);
  expect(new URL(calls().at(-1)![0]).searchParams.has('genreId')).toBe(false);
  const count = calls().length;
  await interaction.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(calls()).toHaveLength(count);
});

test('opções com IDs textuais são rejeitadas em vez de usadas como IDs locais', async () => {
  await open(false, async url => new URL(url).pathname.endsWith('/filters') ? Response.json({ ...options, genres: [{ id: '31', name: 'Inválido' }] }) : result(new URL(url).searchParams));
  expect(await screen.findByText('Não foi possível carregar as opções de filtro.')).toBeVisible();
  expect(screen.queryByRole('option', { name: 'Inválido' })).not.toBeInTheDocument();
});

test('decodificador rejeita opções inválidas, nomes ausentes e IDs duplicados', () => {
  for (const id of ['31', 0, -1, 1.5, 2_147_483_648, null]) expect(() => decodeCatalogFilters({ ...options, genres: [{ id, name: 'Nome' }] })).toThrow();
  for (const genres of [[{ id: 1, name: ' ' }], [{ id: 1 }], [{ id: 1, name: 'A' }, { id: 1, name: 'B' }]]) expect(() => decodeCatalogFilters({ ...options, genres })).toThrow();
  expect(decodeCatalogFilters({ genres: [], platforms: [] })).toEqual({ genres: [], platforms: [] });
});
