import { withFilterOptions } from './http-fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';

import { wireGame, wirePage, wireReview, wireUser, withAuthentication } from './http-fixtures';

function expectNoFavorites(): void {
  for (const name of ['Favoritos', 'Jogos favoritos', 'Reviews favoritas']) {
    expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument();
  }
  for (const text of ['Carregando favoritos…', 'Não foi possível carregar os favoritos.', 'Nenhum jogo favorito.', 'Nenhuma review favorita.']) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
  expect(document.querySelector('.favorites-sections')).toBeNull();
}

async function open(options: { dashboard: boolean; login?: boolean; empty?: boolean; dashboardResponse?: FetchTransport }) {
  const favorites = { games: options.empty ? [] : [wireGame], reviews: options.empty ? [] : [wireReview] };
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const query = new URL(url);
    const path = query.pathname;
    if (path === '/api/v1/games') return Response.json({ ...wirePage([wireGame]), page: Number(query.searchParams.get('page') ?? 1), hasNextPage: true });
    if (path === '/api/v1/dashboard') return options.dashboardResponse ? options.dashboardResponse(url, init) : Response.json({ favorites, feed: [wireReview] });
    if (path === '/api/v1/feed/following') return Response.json([wireReview]);
    if (path === '/api/v1/favorites') return Response.json(favorites);
    if (path.endsWith('/recent')) return Response.json([]);
    if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
    if (path === '/api/v1/users/1') return Response.json(wireUser);
    throw new Error(`Consulta inesperada: ${path}`);
  }, { isolateDashboard: false }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  // undefined reproduz a composição sem dashboard agregado, que antes montava favoritos.
  services.privateFeatures = { ...services.privateFeatures, dashboard: options.dashboard ? true : undefined };
  if (!options.login) await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[options.login ? '/login' : '/']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  if (options.login) {
    await interaction.type(screen.getByLabelText('E-mail', { exact: true }), 'test@example.test');
    await interaction.type(screen.getByLabelText('Senha', { exact: true }), 'test-only');
    await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  }
  await screen.findByRole('link', { name: 'Meu perfil' });
  await within(await screen.findByRole('region', { name: 'Jogos' })).findByRole('link', { name: wireGame.title });
  return { interaction, transport };
}

const cases = [true, false].flatMap(dashboard => [true, false].flatMap(login => [true, false].map(empty => ({ dashboard, login, empty }))));
test.each(cases)('Início sem favoritos, feed ou consultas privadas; perfil disponível: %j', async options => {
 const {interaction,transport}=await open(options);expectNoFavorites();expect(screen.queryByRole('region',{name:'Feed de reviews'})).not.toBeInTheDocument();expect(screen.queryByText('Carregando seu dashboard…')).not.toBeInTheDocument();
 expect(transport.mock.calls.some(([url])=>/\/(dashboard|favorites|feed\/following)$/.test(url))).toBe(false);
 await interaction.click(screen.getByRole('link',{name:'Meu perfil'}));const games=await screen.findByRole('region',{name:'Jogos favoritos'});
 if(options.empty)expect(within(games).getByText('Nenhum jogo favorito.')).toBeVisible();else expect(within(games).getByRole('link',{name:wireGame.title})).toBeVisible();
 expect(transport.mock.calls.filter(([url])=>url.endsWith('/favorites'))).toHaveLength(1);
});
test('falha ou lentidão do dashboard sem consumidor não afeta o Início',async()=>{
 const response=vi.fn<FetchTransport>().mockRejectedValue(new Error('offline'));await open({dashboard:true,dashboardResponse:response});expect(response).not.toHaveBeenCalled();expect(screen.queryByRole('region',{name:'Seu dashboard'})).not.toBeInTheDocument();expectNoFavorites();
});
test.each([true,false])('catálogo preserva busca/ordem/página e feed fica na Comunidade; dashboard=%s',async dashboard=>{
 const {interaction,transport}=await open({dashboard});await interaction.type(screen.getByLabelText('Buscar jogos'),'aventura');await interaction.click(screen.getByRole('button',{name:'Aplicar filtros'}));await within(screen.getByRole('region',{name:'Jogos'})).findByRole('link',{name:wireGame.title});await interaction.selectOptions(screen.getByLabelText('Ordenar por'),'name-desc');await interaction.click(screen.getByRole('button',{name:'Aplicar filtros'}));await within(screen.getByRole('region',{name:'Jogos'})).findByRole('link',{name:wireGame.title});await interaction.click(screen.getByRole('button',{name:'Próxima'}));await screen.findByText('Página 2');
 const query=new URL(transport.mock.calls.filter(([url])=>new URL(url).pathname==='/api/v1/games').at(-1)![0]).searchParams;expect(query.get('term')).toBe('aventura');expect(query.get('sort')).toBe('name-desc');expect(query.get('page')).toBe('2');expectNoFavorites();
 await interaction.click(screen.getByRole('link',{name:'Comunidade'}));expect(transport.mock.calls.filter(([url])=>url.endsWith('/feed/following'))).toHaveLength(0);await interaction.click(screen.getByRole('button',{name:'Feed de reviews'}));await within(await screen.findByRole('region',{name:'Feed de reviews'})).findByText(wireReview.text);await interaction.click(screen.getByRole('button',{name:'Atualizar feed'}));await within(screen.getByRole('region',{name:'Feed de reviews'})).findByText(wireReview.text);expect(transport.mock.calls.filter(([url])=>url.endsWith('/feed/following'))).toHaveLength(2);
});
