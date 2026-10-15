import { wirePage } from './http-fixtures';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame, wireReview, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';
const data={favorites:{games:[wireGame],reviews:[wireReview]},feed:[wireReview]};
test('dashboard tipado e feed usam sessão compartilhada e payloads ausentes',async()=>{
 const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(data)).mockResolvedValueOnce(Response.json([wireReview]));const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport,session});
 if(!services.dashboard)throw new Error('Dashboard HTTP ausente.');expect(await services.dashboard.get()).toEqual(data);expect(await services.community.getFeed({...wireUser,id: 999})).toEqual([wireReview]);expect(transport.mock.calls.map(([url])=>new URL(url).pathname)).toEqual(['/api/v1/dashboard','/api/v1/feed/following']);for(const [url,init]of transport.mock.calls){expect(url).not.toContain('test-only');expect(init.body).toBeUndefined();expect(init.headers).toHaveProperty('Authorization','Bearer test-only');}
});
async function open(options:{empty?:boolean;failure?:boolean;delayed?:Promise<Response>}={}){
 const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url)=>{if(new URL(url).pathname==='/api/v1/games')return Response.json(wirePage([]));if(url.endsWith('/dashboard')){if(options.failure)throw new Error('offline');return options.delayed??Response.json(options.empty?{favorites:{games:[],reviews:[]},feed:[]}:data);}if(url.endsWith('/auth/logout'))return new Response(null,{status:204});if(url.endsWith('/feed/following'))return Response.json([{...wireReview,id:'new',text:'Feed atualizado'}]);throw new Error('Consulta redundante');},{isolateDashboard:false}));
 const interaction=userEvent.setup();render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));return {interaction,transport};
}
test('consulta única inicial alimenta feed sem favoritos na Home; Atualizar feed usa somente feed/following',async()=>{
 const {interaction,transport}=await open();expect(await screen.findByRole('region',{name:'Feed de reviews'})).toBeVisible();expect(screen.queryByRole('region',{name:'Jogos favoritos'})).not.toBeInTheDocument();expect(within(screen.getByRole('region',{name:'Feed de reviews'})).getByText('Review')).toBeVisible();expect(transport.mock.calls.filter(([url])=>url.endsWith('/dashboard'))).toHaveLength(1);expect(transport.mock.calls.some(([url])=>url.endsWith('/favorites')||url.endsWith('/feed/following'))).toBe(false);
 await interaction.click(screen.getByRole('button',{name:'Atualizar feed'}));expect(await within(screen.getByRole('region',{name:'Feed de reviews'})).findByText('Feed atualizado')).toBeVisible();expect(transport.mock.calls.filter(([url])=>url.endsWith('/feed/following'))).toHaveLength(1);expect(transport.mock.calls.filter(([url])=>url.endsWith('/dashboard'))).toHaveLength(1);
});
test('vazio válido não vira erro',async()=>{await open({empty:true});expect(await screen.findByText('Nenhuma review de pessoas seguidas.')).toBeVisible();expect(screen.queryByText('Nenhum jogo favorito.')).not.toBeInTheDocument();});
test('rede mostra erro e não inventa favoritos/feed',async()=>{await open({failure:true});expect(await screen.findByText('Não foi possível carregar seu dashboard.')).toBeVisible();expect(screen.queryByRole('region',{name:'Jogos favoritos'})).not.toBeInTheDocument();});
test('logout ignora dashboard tardio e visitante não consulta privado',async()=>{
 const pending=deferred<Response>();const {interaction,transport}=await open({delayed:pending.promise});await screen.findByText('Carregando seu dashboard…');await interaction.click(screen.getByRole('button',{name:'Sair'}));await act(async()=>{pending.resolve(Response.json(data));await pending.promise;});expect(screen.queryByRole('region',{name:'Jogos favoritos'})).not.toBeInTheDocument();expect(transport.mock.calls.filter(([url])=>url.endsWith('/dashboard'))).toHaveLength(1);
});
test('visitante carrega somente catálogo público',async()=>{const transport=vi.fn<FetchTransport>().mockResolvedValue(Response.json(wirePage()));render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);await screen.findByText('Nenhum jogo disponível.');expect(transport).toHaveBeenCalledTimes(1);expect(transport.mock.calls[0][1].headers).not.toHaveProperty('Authorization');});
