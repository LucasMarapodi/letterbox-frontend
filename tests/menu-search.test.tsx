import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireGame, wireUser } from './http-fixtures';

const person = { id: 7, username: 'mario', displayName: 'Mario', avatarUrl: null };
const game = { id: 12, title: 'Mario World', coverUrl: null, summary: '', releaseDate: null };
const ready = (items: unknown[]) => ({ status: 'ready', items, page: 1, pageSize: 5, hasNextPage: false, error: null, metadata: null });
const skipped = { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null };
const unavailable = { ...skipped, status: 'unavailable', error: { code: 'integration_unavailable', message: 'Indisponível.' } };
const result = (query = 'mario') => ({ query, people: ready([person]), games: ready([game]), error: null });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
async function advance(ms = 300) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function Location() { return <output aria-label="URL atual">{useLocation().pathname}{useLocation().search}</output>; }
function open(respond: FetchTransport = async url => Response.json(result(new URL(url).searchParams.get('q') ?? 'mario'))) {
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/search') return respond(url, init);
    if (path === '/api/v1/games/12') return Response.json(wireGame);
    if (path === '/api/v1/users/7') return Response.json({ ...wireUser, ...person, bio: '' });
    if (path.endsWith('/opinions')) return Response.json({ averageRating: null, reviews: [] });
    return Response.json([]);
  });
  const view = render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport })} /><Location /></MemoryRouter>);
  return { ...view, input: screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' }), interaction: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }), calls: () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/search') };
}

test('visitante: trim, mínimo de três e 300 ms produzem uma chamada agregada pública', async () => {
  const { input, interaction, calls } = open();
  await interaction.type(input, ' ab'); await advance(); expect(calls()).toHaveLength(0);
  expect(screen.getByText('Digite pelo menos 3 caracteres.')).toBeVisible();
  await interaction.clear(input); await interaction.type(input, ' mario ');
  await advance(299); expect(calls()).toHaveLength(0);
  await advance(1); expect(calls()).toHaveLength(1);
  expect(Object.fromEntries(new URL(calls()[0][0]).searchParams)).toEqual({ q: 'mario', mode: 'suggestions', scope: 'all', page: '1' });
  expect(calls()[0][1].headers).not.toHaveProperty('Authorization');
  expect(screen.getAllByRole('option')).toHaveLength(2);
  expect(input).not.toHaveAttribute('aria-activedescendant');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('digitação rápida aborta consulta anterior e somente a resposta atual altera a lista', async () => {
  const old = deferred<Response>(); const latest = deferred<Response>();
  const { input, interaction, calls } = open(url => new URL(url).searchParams.get('q') === 'mario' ? old.promise : latest.promise);
  await interaction.type(input, 'mario'); await advance();
  const signal = calls()[0][1].signal;
  await interaction.clear(input); await interaction.type(input, 'zelda'); await advance();
  expect(signal?.aborted).toBe(true);
  await act(async () => { old.resolve(Response.json(result())); await old.promise; });
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
  await act(async () => { latest.resolve(Response.json({ ...result('zelda'), games: ready([{ ...game, title: 'Zelda' }]) })); await latest.promise; });
  expect(screen.getByRole('option', { name: /Zelda/ })).toBeVisible();
  expect(screen.queryByRole('option', { name: /Mario World/ })).not.toBeInTheDocument();
});

test.each(['Escape', 'Tab', 'fora'])('%s fecha e invalida consulta pendente sem reabrir por resposta tardia', async action => {
  const pending = deferred<Response>();
  const { input, interaction, calls } = open(() => pending.promise);
  await interaction.type(input, 'mario'); await advance();
  if (action === 'fora') await interaction.click(screen.getByRole('heading', { name: 'Entrar' }));
  else await interaction.keyboard(`{${action}}`);
  expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(calls()[0][1].signal?.aborted).toBe(true);
  await act(async () => { pending.resolve(Response.json(result())); await pending.promise; });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('falha parcial preserva Pessoas; retry só de Jogos usa o mesmo termo', async () => {
  const retry = deferred<Response>();
  const { input, interaction, calls } = open(async url => new URL(url).searchParams.get('scope') === 'games' ? retry.promise : Response.json({ ...result(), games: unavailable }));
  await interaction.type(input, 'mario'); await advance();
  expect(screen.getByRole('option', { name: /Mario @mario/ })).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente Jogos' }));
  expect(screen.getByRole('option', { name: /Mario @mario/ })).toBeVisible();
  expect(new URL(calls()[1][0]).searchParams.get('scope')).toBe('games');
  expect(screen.getByText('Carregando Jogos…')).toBeVisible();
  await act(async () => { retry.resolve(Response.json({ ...result(), people: skipped })); await retry.promise; });
  expect(screen.getAllByRole('option')).toHaveLength(2);
});

test('setas selecionam explicitamente e Enter abre jogo; clique abre perfil com ID local', async () => {
  const { input, interaction } = open();
  await interaction.type(input, 'mario'); await advance();
  expect(input).not.toHaveAttribute('aria-activedescendant');
  await interaction.keyboard('{ArrowDown}{ArrowDown}');
  expect(screen.getByRole('option', { name: /Mario World/ })).toHaveAttribute('aria-selected', 'true');
  await interaction.keyboard('{Enter}'); await advance(0);
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/jogos/12');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  const search = screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
  await interaction.type(search, 'mario'); await advance();
  await interaction.click(screen.getByRole('option', { name: /Mario @mario/ })); await advance(0);
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/perfil/7');
});

test('Enter curto não navega; fechamento antes do debounce não envia requisição', async () => {
  const { input, interaction, calls } = open();
  await interaction.type(input, 'ab{Enter}'); await advance();
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/login');
  await interaction.type(input, 'c{Escape}'); await advance();
  expect(calls()).toHaveLength(0);
});

test('vazio é explícito por grupo e ID textual não é aceito como resposta válida', async () => {
  let malformed = false;
  const { input, interaction } = open(async () => Response.json(malformed ? { ...result(), people: ready([{ ...person, id: '7' }]) } : { ...result(), people: ready([]), games: ready([]) }));
  await interaction.type(input, 'mario'); await advance();
  expect(screen.getByText('Nenhuma pessoa encontrada.')).toBeVisible();
  expect(screen.getByText('Nenhum jogo encontrado.')).toBeVisible();
  malformed = true;
  await interaction.clear(input); await interaction.type(input, 'marios'); await advance();
  expect(screen.getByRole('button', { name: 'Tentar novamente Pessoas' })).toBeVisible();
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});

test('menos de três caracteres limpa a lista, aborta e não mantém opção ativa', async () => {
  const { input, interaction, calls } = open();
  await interaction.type(input, 'mario'); await advance();
  await interaction.keyboard('{ArrowDown}');
  fireEvent.change(input, { target: { value: 'ma' } }); await advance();
  expect(input).not.toHaveAttribute('aria-activedescendant');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
  expect(calls()).toHaveLength(1);
});
