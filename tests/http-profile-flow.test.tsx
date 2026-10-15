import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview } from './http-fixtures';
test('perfil composto e conexões consultam o ID opaco sem Bearer',async()=>{
  const transport=vi.fn<FetchTransport>().mockImplementation(async(url)=>Response.json(url.endsWith('/reviews')?[wireReview]:url.endsWith('/followers')?[wireUser]:url.endsWith('/following')?[]:wireUser));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport}).community;
  expect(await service.getProfile(wireUser.id)).toEqual({user:wireUser,reviews:[wireReview]});expect(await service.getConnections(wireUser.id)).toEqual({followers:[wireUser],following:[]});
  expect(transport).toHaveBeenCalledTimes(4);for(const [url,init] of transport.mock.calls){expect(url).toContain('/users/1');expect(init.headers).not.toHaveProperty('Authorization');}
});
test('somente 404 do usuário significa perfil ausente; lista 404/rede não viram ausência',async()=>{
  const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404})).mockResolvedValueOnce(Response.json(wireUser)).mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404})).mockRejectedValueOnce(new Error('offline'));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport}).community;
  expect(await service.getProfile(999)).toBeNull();await expect(service.getProfile(wireUser.id)).rejects.toMatchObject({status:404});await expect(service.getProfile(wireUser.id)).rejects.toMatchObject({kind:'network'});
});
function open(transport:FetchTransport):void{render(<MemoryRouter initialEntries={['/perfil/1']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);}
test('visitante vê perfil/reviews/links da API e lista vazia válida',async()=>{
  open(async(url)=>Response.json(url.endsWith('/reviews')?[wireReview]:url.endsWith('/followers')?[{...wireUser,id:2,displayName:'Outro'}]:url.endsWith('/following')?[]:wireUser));
  expect(await screen.findByRole('heading',{name:'Ana',level:2})).toBeVisible();expect(screen.getByRole('link',{name:'Ler review de Jogo HTTP'})).toHaveAttribute('href','/reviews/55');expect(await screen.findByRole('link',{name:'Outro'})).toHaveAttribute('href','/perfil/2');expect(screen.getByText('Nenhuma pessoa seguida.')).toBeVisible();
});
test('erro parcial de conexões mantém perfil e mostra falha apropriada',async()=>{
  open(async(url)=>{if(url.endsWith('/following'))throw new Error('offline');return Response.json(url.endsWith('/reviews')?[]:url.endsWith('/followers')?[]:wireUser);});
  expect(await screen.findByRole('heading',{name:'Ana',level:2})).toBeVisible();expect(await screen.findByText('Não foi possível carregar as conexões.')).toBeVisible();expect(screen.queryByText('Perfil não encontrado.')).not.toBeInTheDocument();
});
test('erro da lista de reviews não exibe perfil inexistente',async()=>{
  open(async(url)=>url.endsWith('/reviews')?Response.json({code:'not_found',message:'Seguro'},{status:404}):Response.json(wireUser));expect(await screen.findByText('Não foi possível carregar o perfil.')).toBeVisible();expect(screen.queryByText('Perfil não encontrado.')).not.toBeInTheDocument();
});
