import { wirePage } from './http-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame, wireRating, withAuthentication } from './http-fixtures';
test.each([null,0,4.5])('nota HTTP %s mantém null zero e decimal sem campos de autoria',async(value)=>{
  const session=createHttpSessionStore(); session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockImplementation(async(_url,init)=>Response.json(init.method==='PUT'?{...wireRating,value:4.5}:{rating:value===null?null:{...wireRating,value}}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session}).community;
  expect(await service.getRating(wireGame.id,wireUser)).toEqual(value===null?null:{...wireRating,value});
  expect(await service.rate(wireGame.id,4.5,{...wireUser,id:'forged'})).toMatchObject({userId:wireUser.id,value:4.5});
  expect(transport.mock.calls[1][1].body).toBe('{"value":4.5}'); expect(transport.mock.calls[1][1].headers).toHaveProperty('Authorization','Bearer test-only');
});
test.each([[400,'validation_failed','invalid-rating'],[401,'unauthorized','session-required'],[404,'not_found','not-found']] as const)('erro de nota HTTP %s não vira sucesso',async(status,code,expected)=>{
  const session=createHttpSessionStore(); session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockResolvedValue(Response.json({code,message:'Seguro'},{status}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session}).community;
  await expect(service.rate('g',5,wireUser)).rejects.toMatchObject({code:expected}); if(status===401) expect(session.current()).toBeNull();
});
test('visitante não usa identidade arbitrária como autorização',async()=>{
  const transport=vi.fn<FetchTransport>(); const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport}).community;
  await expect(service.rate('g',5,wireUser)).rejects.toMatchObject({code:'session-required'}); expect(transport).not.toHaveBeenCalled();
});
test('estrelas recuperam decimal e gravação refresca jogo e média HTTP',async()=>{
  let saved=false;
  const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    if(new URL(url).pathname==='/api/v1/games') return Response.json(wirePage([wireGame]));
    if(url.endsWith('/rating/me')) { if(init.method==='PUT') {saved=true; return Response.json({...wireRating,value:5});} return Response.json({rating:{...wireRating,value:4.5}}); }
    if(url.endsWith('/opinions')) return Response.json({averageRating:saved?5:0,reviews:[]});
    return Response.json({...wireGame,averageRating:saved?5:0});
  }));
  const interaction=userEvent.setup(); render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport})}/></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'test@example.com'); await interaction.type(screen.getByLabelText('Senha'),'test-only'); await interaction.click(screen.getByRole('button',{name:'Entrar'}));
  await interaction.click(await screen.findByRole('link',{name:wireGame.title}));
  expect(await screen.findByText('4.5 de 5 estrelas')).toBeVisible();
  await interaction.click(screen.getByRole('radio',{name:'5 estrelas'})); await interaction.click(screen.getByRole('button',{name:'Salvar nota'}));
  expect(await screen.findByText('Nota 5 salva.')).toBeVisible(); expect(await screen.findByText('Nota média: 5 de 5')).toBeVisible();
  expect(transport.mock.calls.filter(([url,init])=>url.endsWith('/games/game%252F42')&&init.method==='GET')).toHaveLength(2);
  expect(transport.mock.calls.filter(([url])=>url.endsWith('/opinions'))).toHaveLength(2);
});
