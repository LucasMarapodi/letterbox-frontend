import { withFilterOptions } from './http-fixtures';
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
 const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(data)).mockResolvedValueOnce(Response.json([wireReview]));const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{ transport: withFilterOptions(transport),session});
 if(!services.dashboard)throw new Error('Dashboard HTTP ausente.');expect(await services.dashboard.get()).toEqual(data);expect(await services.community.getFeed({...wireUser,id: 999})).toEqual([wireReview]);expect(transport.mock.calls.map(([url])=>new URL(url).pathname)).toEqual(['/api/v1/dashboard','/api/v1/feed/following']);for(const [url,init]of transport.mock.calls){expect(url).not.toContain('test-only');expect(init.body).toBeUndefined();expect(init.headers).toHaveProperty('Authorization','Bearer test-only');}
});
async function open(options:{empty?:boolean;failure?:boolean;delayed?:Promise<Response>;guest?:boolean;disabled?:boolean}={}){
 let feedReads=0;
 const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url=>{
  if(new URL(url).pathname==='/api/v1/games')return Response.json(wirePage([]));
  if(url.endsWith('/recent'))return Response.json([]);
  if(url.endsWith('/favorites'))return Response.json({games:[],reviews:[]});
  if(url.endsWith('/like/me'))return Response.json({likedByMe:false});
  if(url.endsWith('/auth/logout'))return new Response(null,{status:204});
  if(url.endsWith('/feed/following')){feedReads++;if(options.failure)throw new Error('offline');return options.delayed??Response.json(options.empty?[]:feedReads===1?[wireReview]:[{...wireReview,id:56,text:'Feed atualizado'}]);}
  throw new Error('Consulta sem consumidor');
 },{isolateDashboard:false}));
 const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport:withFilterOptions(transport)});if(options.disabled)services.privateFeatures={...services.privateFeatures,feed:false};
 const interaction=userEvent.setup();render(<MemoryRouter initialEntries={[options.guest?'/comunidade':'/login']}><AppRoutes adapters={services}/></MemoryRouter>);
 if(!options.guest){await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await screen.findByLabelText('Usuário conectado');}
 async function feed(){if(!options.guest)await interaction.click(screen.getByRole('link',{name:'Comunidade'}));await interaction.click(screen.getByRole('button',{name:'Feed de reviews'}));}
 return{interaction,transport,feed};
}
test('feed só consulta após ativar aba, mantém atualização e não usa dashboard',async()=>{
 const {interaction,transport,feed}=await open();expect(screen.queryByRole('region',{name:'Feed de reviews'})).not.toBeInTheDocument();expect(transport.mock.calls.some(([url])=>url.endsWith('/dashboard')||url.endsWith('/feed/following'))).toBe(false);
 await interaction.click(screen.getByRole('link',{name:'Comunidade'}));expect(screen.getByRole('button',{name:'Recentes'})).toHaveAttribute('aria-pressed','true');expect(transport.mock.calls.some(([url])=>url.endsWith('/feed/following'))).toBe(false);await feed();
 expect(await within(await screen.findByRole('region',{name:'Feed de reviews'})).findByText('Review')).toBeVisible();expect(screen.queryByLabelText('Período dos rankings')).not.toBeInTheDocument();
 await interaction.click(screen.getByRole('button',{name:'Atualizar feed'}));expect(await within(screen.getByRole('region',{name:'Feed de reviews'})).findByText('Feed atualizado')).toBeVisible();expect(transport.mock.calls.filter(([url])=>url.endsWith('/feed/following'))).toHaveLength(2);expect(transport.mock.calls.some(([url])=>url.endsWith('/dashboard'))).toBe(false);
});
test('vazio válido não vira erro',async()=>{const {feed}=await open({empty:true});await feed();expect(await screen.findByText('Nenhuma review de pessoas seguidas.')).toBeVisible();});
test('rede mostra erro com retry e preserva navegação da comunidade',async()=>{const {feed}=await open({failure:true});await feed();expect(await screen.findByText('Não foi possível carregar o feed.')).toBeVisible();expect(screen.getByRole('button',{name:'Recentes'})).toBeVisible();expect(screen.getByRole('button',{name:'Tentar novamente'})).toBeVisible();});
test('logout ignora feed tardio e visitante não consulta privado',async()=>{
 const pending=deferred<Response>();const {interaction,transport,feed}=await open({delayed:pending.promise});await feed();await screen.findByText('Carregando feed…');await interaction.click(screen.getByRole('button',{name:'Sair'}));await act(async()=>{pending.resolve(Response.json([wireReview]));});expect(screen.queryByRole('region',{name:'Feed de reviews'})).not.toBeInTheDocument();expect(transport.mock.calls.filter(([url])=>url.endsWith('/feed/following'))).toHaveLength(1);
});
test('visitante não recebe aba de feed nem consulta privada',async()=>{
 const {transport}=await open({guest:true});expect(screen.queryByRole('button',{name:'Feed de reviews'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Entrar para ver o feed'})).not.toBeInTheDocument();expect(screen.queryByLabelText('Período dos rankings')).not.toBeInTheDocument();expect(transport.mock.calls.some(([url])=>url.endsWith('/feed/following'))).toBe(false);
});
test('feed desativado não aparece nas abas nem é consultado',async()=>{
 const {interaction,transport}=await open({disabled:true});await interaction.click(screen.getByRole('link',{name:'Comunidade'}));expect(screen.queryByRole('button',{name:'Feed de reviews'})).not.toBeInTheDocument();expect(transport.mock.calls.some(([url])=>url.endsWith('/feed/following'))).toBe(false);
});
