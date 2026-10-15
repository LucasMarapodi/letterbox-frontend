import { wirePage } from './http-fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame, wireReview, wireFavorite, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';
test('listas/wrappers e ações de game/review usam corpos ausentes e DELETE 204',async()=>{
 const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
 const reviewFavorite={...wireFavorite,targetType:'review',targetId:wireReview.id};const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({games:[wireGame],reviews:[wireReview]})).mockResolvedValueOnce(Response.json({favorite:null})).mockResolvedValueOnce(Response.json(wireFavorite)).mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(Response.json({favorite:null})).mockResolvedValueOnce(Response.json(reviewFavorite)).mockResolvedValueOnce(new Response(null,{status:204}));
 const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{session,transport}).community;
 expect(await service.getFavorites(wireUser)).toEqual({games:[wireGame],reviews:[wireReview]});expect(await service.getFavorite('game',wireGame.id,wireUser)).toBeNull();expect(await service.setFavorite('game',wireGame.id,true,{...wireUser,id: 999})).toEqual(wireFavorite);expect(await service.setFavorite('game',wireGame.id,false,wireUser)).toBeNull();expect(await service.getFavorite('review',wireReview.id,wireUser)).toBeNull();expect(await service.setFavorite('review',wireReview.id,true,wireUser)).toEqual(reviewFavorite);expect(await service.setFavorite('review',wireReview.id,false,wireUser)).toBeNull();
 expect(transport.mock.calls.map(([,init])=>init.method)).toEqual(['GET','GET','PUT','DELETE','GET','PUT','DELETE']);expect(transport.mock.calls[2][0]).toContain('/favorites/game/12');expect(transport.mock.calls[5][0]).toContain('/favorites/review/55');for(const [,init]of transport.mock.calls){expect(init.body).toBeUndefined();expect(init.headers).toHaveProperty('Authorization','Bearer test-only');}
});
test('visitante rejeitado, erro 404 não vira null e resposta de A após troca por B é cancelada',async()=>{
 const session=createHttpSessionStore();const pending=deferred<Response>();const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404})).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(Response.json({games:[],reviews:[]}));const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{session,transport}).community;
 await expect(service.getFavorites(wireUser)).rejects.toMatchObject({code:'session-required'});expect(transport).not.toHaveBeenCalled();session.establish({user:wireUser,token:'a-test',expiresAt:'2080-01-01T00:00:00Z'});await expect(service.getFavorite('game',999,wireUser)).rejects.toMatchObject({code:'not-found'});
 const old=service.getFavorites(wireUser).catch((error:unknown)=>error);session.clear();session.establish({user:{...wireUser,id:2},token:'b-test',expiresAt:'2080-01-01T00:00:00Z'});pending.resolve(Response.json({games:[wireGame],reviews:[wireReview]}));expect(await old).toMatchObject({kind:'cancelled'});expect(await service.getFavorites({...wireUser,id:2})).toEqual({games:[],reviews:[]});
});
async function open(failure=false){let game=false;let review=false;const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
 const path=new URL(url).pathname;
 if(path==='/api/v1/games')return Response.json(wirePage([wireGame]));
 if(path==='/api/v1/favorites')return Response.json({games:game?[wireGame]:[],reviews:review?[wireReview]:[]});
 if(path.includes('/favorites/')){const isGame=path.includes('/favorites/game/');const selected=isGame?game:review;const favorite={...wireFavorite,targetType:isGame?'game':'review',targetId:isGame?wireGame.id:wireReview.id};if(init.method==='GET')return Response.json({favorite:selected?favorite:null});if(failure)throw new Error('offline');if(isGame)game=init.method==='PUT';else review=init.method==='PUT';return init.method==='PUT'?Response.json(favorite):new Response(null,{status:204});}
 if(url.endsWith('/rating/me'))return Response.json({rating:null});if(url.endsWith('/reviews/me'))return Response.json({review:null});if(url.endsWith('/opinions'))return Response.json({averageRating:null,reviews:[wireReview]});
 if(url.endsWith('/reviews')||url.endsWith('/followers')||url.endsWith('/following')||url.endsWith('/comments'))return Response.json([]);
 if(path.includes('/users/'))return Response.json(wireUser);
 if(path.includes('/reviews/'))return Response.json(wireReview);
 return Response.json(wireGame);
}));const interaction=userEvent.setup();render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport})}/></MemoryRouter>);await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await screen.findByRole('link',{name:wireGame.title});return {interaction,transport};}
test('Home não duplica GET favorites; ações dos dois tipos aparecem no próprio perfil e remoção refresca lista',async()=>{
 const {interaction,transport}=await open();expect(transport.mock.calls.filter(([url])=>new URL(url).pathname==='/api/v1/favorites')).toHaveLength(0);
 await interaction.click(screen.getByRole('link',{name:wireGame.title}));await interaction.click(await screen.findByRole('button',{name:'Favoritar jogo'}));await screen.findByRole('button',{name:'Remover jogo dos favoritos'});
 await interaction.click(await screen.findByRole('link',{name:'Review de Ana'}));await interaction.click(await screen.findByRole('button',{name:'Favoritar review'}));await screen.findByRole('button',{name:'Remover review dos favoritos'});
 await interaction.click(screen.getByRole('link',{name:'Meu perfil'}));expect(await within(await screen.findByRole('region',{name:'Jogos favoritos'})).findByRole('link',{name:wireGame.title})).toBeVisible();expect(screen.getByRole('link',{name:'Review de Ana: Jogo HTTP'})).toHaveAttribute('href','/reviews/55');
 await interaction.click(within(screen.getByRole('region',{name:'Jogos favoritos'})).getByRole('link',{name:wireGame.title}));await interaction.click(await screen.findByRole('button',{name:'Remover jogo dos favoritos'}));await screen.findByRole('button',{name:'Favoritar jogo'});await interaction.click(screen.getByRole('link',{name:'Meu perfil'}));expect(await screen.findByText('Nenhum jogo favorito.')).toBeVisible();expect(transport.mock.calls.filter(([url])=>new URL(url).pathname==='/api/v1/favorites')).toHaveLength(4);
});
test('falha de favorito preserva botão e não confirma sucesso',async()=>{const {interaction}=await open(true);await interaction.click(screen.getByRole('link',{name:wireGame.title}));await interaction.click(await screen.findByRole('button',{name:'Favoritar jogo'}));expect(await screen.findByText('Não foi possível atualizar o favorito. Tente novamente.')).toBeVisible();expect(screen.getByRole('button',{name:'Favoritar jogo'})).toHaveAttribute('aria-pressed','false');});
