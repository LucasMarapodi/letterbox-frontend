import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { StrictMode } from 'react';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame } from './http-fixtures';
import { deferred } from './fixtures';

const person = { id: 7, username: 'mario', displayName: 'Mario', avatarUrl: null };
const game = { id: 12, title: 'Mario World', summary: '<b>Aventura</b>', coverUrl: null, releaseDate: null };
const skipped = { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null };
function body(query: URLSearchParams) {
  const page = Number(query.get('page') ?? 1);
  const ready = (items: unknown[]) => ({ status: 'ready', items, page, pageSize: 20, hasNextPage: page < 2, error: null, metadata: null });
  return { query: query.get('q'), people: query.get('scope') === 'games' ? skipped : ready([{ ...person, displayName: `Mario página ${page}` }]), games: query.get('scope') === 'people' ? skipped : ready([game]), error: null };
}
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><output aria-label="URL atual">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Voltar histórico</button><button onClick={() => navigate(1)}>Avançar histórico</button></>; }
function open(route = '/pesquisa?q=mario&aba=pessoas&page=1', respond: (query: URLSearchParams) => Promise<Response> = async query => Response.json(body(query)), strict = false) {
  const transport = vi.fn<FetchTransport>().mockImplementation(async url => {
    const parsed = new URL(url);
    if (parsed.pathname === '/api/v1/search') return respond(parsed.searchParams);
    if (parsed.pathname === '/api/v1/users/7') return Response.json({ ...wireUser, ...person, bio: '' });
    if (parsed.pathname === '/api/v1/games/12') return Response.json(wireGame);
    if (parsed.pathname.endsWith('/opinions')) return Response.json({ averageRating: null, reviews: [] });
    return Response.json([]);
  });
  const app = <MemoryRouter initialEntries={[route]}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport })} /><Location /></MemoryRouter>;
  const view = render(strict ? <StrictMode>{app}</StrictMode> : app);
  return { ...view, interaction: userEvent.setup(), queries: () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/search').map(([url]) => Object.fromEntries(new URL(url).searchParams)) };
}

test('URL direta consulta 20 por categoria em uma chamada, Pessoas padrão e Jogos em cache', async () => {
  const { interaction, queries } = open();
  expect(await screen.findByRole('link', { name: /Mario página 1/ })).toHaveAttribute('href', '/perfil/7');
  expect(queries()).toEqual([{ q: 'mario', mode: 'results', scope: 'all', page: '1' }]);
  expect(screen.getByRole('tab', { name: 'Pessoas' })).toHaveAttribute('aria-selected', 'true');
  await interaction.click(screen.getByRole('tab', { name: 'Jogos' }));
  expect(await screen.findByRole('link', { name: 'Mario World' })).toHaveAttribute('href', '/jogos/12');
  expect(screen.getByText('<b>Aventura</b>')).toBeVisible();
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/pesquisa?q=mario&aba=jogos&page=1');
  expect(queries()).toHaveLength(1);
  expect(screen.queryByLabelText('Itens por página')).not.toBeInTheDocument();
});

test('StrictMode não duplica a consulta inicial de resultados', async () => {
  const { queries } = open(undefined, undefined, true);
  await screen.findByRole('link', { name: /Mario página 1/ });
  expect(queries()).toHaveLength(1);
});

test('paginação é por categoria e histórico recupera URL e cache; trocar aba reinicia página', async () => {
  const { interaction, queries } = open();
  await screen.findByRole('link', { name: /Mario página 1/ });
  await interaction.click(screen.getByRole('button', { name: 'Próxima' }));
  await screen.findByRole('link', { name: /Mario página 2/ });
  expect(queries().at(-1)).toMatchObject({ mode: 'results', scope: 'people', page: '2' });
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  await interaction.click(screen.getByRole('tab', { name: 'Jogos' }));
  await screen.findByRole('link', { name: 'Mario World' });
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('aba=jogos&page=1');
  await interaction.click(screen.getByRole('button', { name: 'Voltar histórico' }));
  await screen.findByRole('link', { name: /Mario página 2/ });
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('aba=pessoas&page=2');
  await interaction.click(screen.getByRole('button', { name: 'Avançar histórico' }));
  await screen.findByRole('link', { name: 'Mario World' });
  expect(queries()).toHaveLength(2);
});

test('URL compartilhada de Jogos página 2 consulta só Jogos e normaliza parâmetros inválidos', async () => {
  const { queries } = open('/pesquisa?q=%20mario%20&aba=jogos&page=2');
  await screen.findByRole('link', { name: 'Mario World' });
  expect(queries()).toEqual([{ q: 'mario', mode: 'results', scope: 'games', page: '2' }]);
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/pesquisa?q=mario&aba=jogos&page=2');
});

test.each(['/pesquisa?q=ab&aba=jogos&page=2', '/pesquisa'])('termo inválido %s orienta sem HTTP', async route => {
  const { queries } = open(route);
  expect(await screen.findByText('Digite pelo menos 3 caracteres.')).toBeVisible();
  expect(queries()).toHaveLength(0);
});

test('aba e página inválidas usam Pessoas/1 sem consulta duplicada', async () => {
  const { queries } = open('/pesquisa?q=mario&aba=desconhecida&page=-1');
  await screen.findByRole('link', { name: /Mario página 1/ });
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/pesquisa?q=mario&aba=pessoas&page=1');
  expect(queries()).toHaveLength(1);
});

test('erro parcial mantém Pessoas; retry só de Jogos mantém termo/aba/página e metadata', async () => {
  let retry = false;
  const { interaction, queries } = open(undefined, async query => {
    const value = body(query);
    return Response.json(retry ? { ...value, games: { ...value.games, metadata: { fetchedAt: '2026-10-15T12:00:00Z', isStale: true } } } : { ...value, games: { ...skipped, status: 'unavailable', error: { code: 'integration_timeout', message: 'Falha' } } });
  });
  await screen.findByRole('link', { name: /Mario página 1/ });
  await interaction.click(screen.getByRole('tab', { name: 'Jogos' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar Jogos.');
  expect(screen.queryByText('Nenhum jogo encontrado.')).not.toBeInTheDocument();
  retry = true;
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('link', { name: 'Mario World' });
  expect(screen.getByText(/Dados de Jogos desatualizados/)).toBeVisible();
  expect(queries()).toHaveLength(2);
  expect(queries()[1]).toEqual({ q: 'mario', mode: 'results', scope: 'games', page: '1' });
  await interaction.click(screen.getByRole('tab', { name: 'Pessoas' }));
  expect(await screen.findByRole('link', { name: /Mario página 1/ })).toBeVisible();
  expect(queries()).toHaveLength(2);
});

test('Enter no menu codifica termo e reinicia Pessoas/1 sem sugestões redundantes', async () => {
  const { interaction, queries } = open('/login');
  await interaction.type(screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' }), 'a & b{Enter}');
  await screen.findByRole('link', { name: /Mario página 1/ });
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/pesquisa?q=a+%26+b&aba=pessoas&page=1');
  expect(queries()).toEqual([{ q: 'a & b', mode: 'results', scope: 'all', page: '1' }]);
  await interaction.click(screen.getByRole('tab', { name: 'Jogos' }));
  await screen.findByRole('link', { name: 'Mario World' });
  await interaction.clear(screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' }));
  await interaction.type(screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' }), 'novo{Enter}');
  await waitFor(() => expect(screen.getByLabelText('URL atual')).toHaveTextContent('q=novo&aba=pessoas&page=1'));
  expect(queries().at(-1)).toEqual({ q: 'novo', mode: 'results', scope: 'all', page: '1' });
});

test('resposta de termo anterior é abortada e não sobrescreve resultado novo', async () => {
  const pending = deferred<Response>();
  const { interaction, queries } = open(undefined, async query => query.get('q') === 'mario' ? pending.promise : Response.json(body(query)));
  await interaction.type(screen.getByRole('combobox', { name: 'Buscar pessoas e jogos' }), 'novo{Enter}');
  await screen.findByRole('link', { name: /Mario página 1/ });
  await act(async () => { pending.resolve(Response.json({ ...body(new URLSearchParams('q=mario&scope=all')), people: { ...body(new URLSearchParams('q=mario&scope=all')).people, items: [{ ...person, displayName: 'Obsoleto' }] } })); await pending.promise; });
  expect(screen.queryByText('Obsoleto')).not.toBeInTheDocument();
  expect(queries().at(-1)).toMatchObject({ q: 'novo', mode: 'results' });
});
