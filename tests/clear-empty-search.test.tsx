import { withFilterOptions } from './http-fixtures';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';

function response(query: URLSearchParams, title = 'Jogo atual'): Response {
  return Response.json({ items: [{ ...wireGame, title }], page: Number(query.get('page') ?? 1), pageSize: Number(query.get('pageSize') ?? 20), hasNextPage: true });
}
async function open(respond: (query: URLSearchParams) => Promise<Response> = async query => response(query), authenticated = false) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => respond(new URL(url).searchParams)));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  if (authenticated) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  return { interaction: userEvent.setup(), queries: () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games').map(([url]) => Object.fromEntries(new URL(url).searchParams)) };
}

test.each([false, true])('sem busca: cliques repetidos preservam página 3, ordenação, tamanho e resultados; autenticado=%s', async authenticated => {
  const { interaction, queries } = await open(undefined, authenticated);
  await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '50');
  await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await screen.findByText('Página 1');
  for (const page of [2, 3]) {
    await interaction.click(screen.getByRole('button', { name: 'Próxima' })); await screen.findByText(`Página ${page}`);
  }
  const count = queries().length;
  const card = screen.getByRole('link', { name: 'Jogo atual' });
  await interaction.dblClick(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(queries()).toHaveLength(count);
  expect(screen.getByText('Página 3')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo atual' })).toBe(card);
  expect(screen.getByRole('region', { name: 'Jogos' })).toHaveAttribute('aria-busy', 'false');
  expect(screen.getByLabelText('Itens por página')).toHaveValue('50');
  expect(screen.getByLabelText('Ordenar por')).toHaveValue('name-desc');
});

test.each(['', '   '])('carregamento inicial pendente com campo %j não recebe consultas extras ao limpar', async term => {
  const pending = deferred<Response>();
  const { interaction, queries } = await open(() => pending.promise.then(value => value.clone()));
  if (term) await interaction.type(screen.getByLabelText('Buscar jogos'), term);
  await interaction.dblClick(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(queries()).toHaveLength(1);
  expect(screen.getByRole('region', { name: 'Jogos' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue(term);
  await act(async () => { pending.resolve(response(new URLSearchParams())); await pending.promise; });
  expect(await screen.findByRole('link', { name: 'Jogo atual' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Jogos' })).toHaveAttribute('aria-busy', 'false');
});

test('rascunho não aplicado é apagado localmente sem mudar página nem resultados', async () => {
  const { interaction, queries } = await open();
  await screen.findByText('Página 1');
  await interaction.click(screen.getByRole('button', { name: 'Próxima' })); await screen.findByText('Página 2');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'rascunho');
  const count = queries().length;
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue('');
  expect(queries()).toHaveLength(count);
  expect(screen.getByText('Página 2')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo atual' })).toBeVisible();
});

test.each(['erro', 'pendente'])('apagar rascunho preserva estado %s da consulta', async state => {
  const pending = deferred<Response>();
  const { interaction, queries } = await open(() => state === 'erro' ? Promise.reject(new TypeError('offline')) : pending.promise);
  if (state === 'erro') await screen.findByRole('alert');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'rascunho');
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue('');
  expect(queries()).toHaveLength(1);
  if (state === 'erro') expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os jogos.');
  else {
    expect(screen.getByRole('region', { name: 'Jogos' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.resolve(response(new URLSearchParams())); await pending.promise; });
    await screen.findByRole('link', { name: 'Jogo atual' });
  }
});

test('busca aplicada com campo já apagado gera uma consulta sem termo, reseta página e mantém tamanho/ordenação', async () => {
  const pending = deferred<Response>(); let hold = false;
  const { interaction, queries } = await open(async query => hold ? pending.promise.then(value => value.clone()) : response(query));
  await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Itens por página'), '50'); await screen.findByText('Página 1');
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' })); await screen.findByText('Página 1');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'aplicada{Enter}'); await screen.findByText('Página 1');
  await interaction.click(screen.getByRole('button', { name: 'Próxima' })); await screen.findByText('Página 2');
  await interaction.clear(screen.getByLabelText('Buscar jogos'));
  const count = queries().length; hold = true;
  await interaction.dblClick(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(queries()).toHaveLength(count + 1);
  expect(queries().at(-1)).toEqual({ term: '', sort: 'name-desc', page: '1', pageSize: '50' });
  expect(screen.getByRole('region', { name: 'Jogos' })).toHaveAttribute('aria-busy', 'true');
  await act(async () => { pending.resolve(response(new URLSearchParams('page=1&pageSize=50'))); await pending.promise; });
  await screen.findByText('Página 1');
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(queries()).toHaveLength(count + 1);
});

test('busca pendente bloqueia limpeza; após terminar, limpar restaura ordenação padrão', async () => {
  const pending = deferred<Response>();
  const { interaction, queries } = await open(async query => query.get('term') ? pending.promise : response(query));
  await screen.findByText('Página 1');
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'aplicada{Enter}');
  expect(queries().at(-1)).toMatchObject({ term: 'aplicada', sort: 'release-desc' });
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(queries()).toHaveLength(2);
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  await act(async () => { pending.resolve(response(new URLSearchParams(), 'Resultado aplicado')); await pending.promise; });
  await screen.findByRole('link', { name: 'Resultado aplicado' });
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(await screen.findByRole('link', { name: 'Jogo atual' })).toBeVisible();
  expect(queries().at(-1)).toEqual({ term: '', sort: 'release-desc', page: '1', pageSize: '20' });
  expect(screen.queryByRole('link', { name: 'Resultado aplicado' })).not.toBeInTheDocument();
});
