import { wirePage } from './http-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireReview } from './http-fixtures';
test('catálogo envia filtros e IDs opacos ao HTTP sem Bearer',async()=>{
  const transport=vi.fn<FetchTransport>().mockImplementation(async(url)=>Response.json(new URL(url).pathname==='/api/v1/games'?wirePage([wireGame]):wireGame));
  const games=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport}).games;
  expect(await games.list({term:'a & b',sort:'name-desc'})).toEqual(wirePage([wireGame]));
  expect(await games.getById(wireGame.id)).toEqual(wireGame);
  expect(transport.mock.calls.map(([url])=>url)).toEqual(['http://localhost:5207/api/v1/games?term=a+%26+b&sort=name-desc','http://localhost:5207/api/v1/games/12']);
  for(const [,request] of transport.mock.calls) expect(request.headers).not.toHaveProperty('Authorization');
});
test('404 de detalhe vira null, mas rede/500/contrato não viram ausência',async()=>{
  const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404})).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({code:'internal_error',message:'Seguro'},{status:500})).mockResolvedValueOnce(Response.json({invalid:true}));
  const games=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport}).games;
  expect(await games.getById(99)).toBeNull();
  await expect(games.getById(99)).rejects.toMatchObject({kind:'network'});
  await expect(games.getById(99)).rejects.toMatchObject({status:500});
  await expect(games.getById(99)).rejects.toMatchObject({kind:'contract'});
});
test('Home busca/ordena e abre detalhes/opiniões reais com zero e capa ausente',async()=>{
  const transport=vi.fn<FetchTransport>().mockImplementation(async(url)=>Response.json(url.includes('/opinions')?{averageRating:0,reviews:[wireReview]}:new URL(url).pathname==='/api/v1/games'?wirePage([wireGame]):wireGame));
  const interaction=userEvent.setup(); render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport})}/></MemoryRouter>);
  expect(await screen.findByRole('link',{name:wireGame.title})).toBeVisible();
  expect(screen.getByText('Sem capa')).toBeVisible();
  await interaction.type(screen.getByLabelText('Buscar jogos'),'a & b'); await interaction.click(screen.getByRole('button',{name:'Buscar'}));
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'),'name-desc');
  await interaction.click(screen.getByRole('link',{name:wireGame.title}));
  expect(await screen.findByText('Nota média: 0 de 5')).toBeVisible();
  expect(screen.getByText('29/02/2024')).toBeVisible(); expect(screen.getByRole('link',{name:'Review de Ana'})).toHaveAttribute('href','/reviews/r%2F1');
  expect(transport.mock.calls.some(([url])=>url.includes('term=a+%26+b&sort=name-desc'))).toBe(true);
  expect(screen.queryByText('Ecos do Horizonte')).not.toBeInTheDocument();
});
test('API desligada gera erro na Home e nova tentativa não usa fixture',async()=>{
  const transport=vi.fn<FetchTransport>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json(wirePage()));
  const interaction=userEvent.setup(); render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport})}/></MemoryRouter>);
  expect(await screen.findByText('Não foi possível carregar os jogos.')).toBeVisible();
  expect(screen.queryByText('Ecos do Horizonte')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button',{name:'Tentar novamente'}));
  expect(await screen.findByText('Nenhum jogo disponível.')).toBeVisible();
});
