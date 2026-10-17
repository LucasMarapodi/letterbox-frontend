import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { ServiceProvider } from '../src/services/ServiceProvider';
import { SessionProvider } from '../src/session/SessionProvider';
import { FavoritesProvider } from '../src/components/FavoritesProvider';
import { GameCard } from '../src/components/GameCard';
import { ReviewFavoriteStar } from '../src/components/ReviewFavoriteStar';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wirePage, wireReview, wireUser } from './http-fixtures';
import { deferred } from './fixtures';

async function open(path='/',options:{guest?:boolean;duplicate?:boolean;read?:(read:number)=>Promise<Response>;write?:(kind:string,id:number)=>Promise<Response>}={}){
 let account=wireUser;let selected=new Set([12,13,14]);const reviews=new Set([12]);let reads=0;
 const games=[wireGame,{...wireGame,id:13,title:'Outro jogo'},{...wireGame,id:14,title:'Terceiro jogo'}];
 const lists=()=>({games:games.filter(g=>selected.has(g.id)),reviews:reviews.has(12)?[{...wireReview,id:12}]:[]});
 const completionSnapshots:number[][]=[];
 const transport=vi.fn<FetchTransport>().mockImplementation(async(url,init)=>{
  const p=new URL(url).pathname;
  if(p.endsWith('/auth/login'))return Response.json({user:account,token:`test-${account.id}`,expiresAt:'2080-01-01T00:00:00Z'});
  if(p.endsWith('/auth/me'))return Response.json(account);
  if(p.endsWith('/auth/logout'))return new Response(null,{status:204});
  if(p==='/api/v1/favorites'){reads++;return options.read?options.read(reads):Response.json(lists());}
  const favorite=p.match(/\/favorites\/(game|review)\/(\d+)$/);
  if(favorite){const kind=favorite[1],id=Number(favorite[2]);if(init.method==='GET')throw new Error('Consulta por alvo não permitida');const target=kind==='game'?selected:reviews;const result=options.write?await options.write(kind,id):init.method==='DELETE'?new Response(null,{status:204}):Response.json({id:90+id,userId:account.id,targetType:kind,targetId:id});if(result.ok){if(init.method==='PUT')target.add(id);else target.delete(id);}return result;}
  if(p.endsWith('/profile-completion')){const ids=[...selected];completionSnapshots.push(ids);return Response.json({country:'Brasil',state:'São Paulo',bio:'Descrição',avatarUrl:null,favoriteGameIds:ids,favoriteGameCount:ids.length,isComplete:ids.length>=3});}
  if(p.endsWith('/games/filters'))return Response.json({genres:[],platforms:[]});
  if(p==='/api/v1/games')return Response.json(wirePage(games));
  if(p==='/api/v1/games/12')return Response.json(wireGame);
  if(p.endsWith('/reviews/me'))return Response.json({review:null});
  if(p.endsWith('/opinions'))return Response.json({averageRating:null,reviews:[wireReview]});
  if(p.endsWith('/in-discussion'))return Response.json(games.map(game=>({game,commentCount:1,lastCommentAt:wireReview.createdAt})));
  if(p==='/api/v1/users/1')return Response.json(wireUser);
  if(p.endsWith('/like/me'))return Response.json({likedByMe:false});
  return Response.json([]);
 });
 const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});if(!options.guest)await services.auth.login({email:'favorite@example.test',password:'test-only'});
 if(options.duplicate)render(<MemoryRouter><ServiceProvider value={services}><SessionProvider service={services.auth}><FavoritesProvider><GameCard game={wireGame}/><GameCard game={wireGame}/><ReviewFavoriteStar reviewId={12} author="Ana"/></FavoritesProvider></SessionProvider></ServiceProvider></MemoryRouter>);
 else render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={services}/></MemoryRouter>);
 const interaction=userEvent.setup();const calls=(suffix:string,method?:string)=>transport.mock.calls.filter(([url,init])=>url.endsWith(suffix)&&(!method||init.method===method));
 async function switchAccount(){await interaction.click(screen.getByRole('button',{name:'Sair'}));account={...wireUser,id:4,displayName:'Outra conta'};selected=new Set();await interaction.click(screen.getByRole('link',{name:'Entrar'}));await interaction.type(screen.getByLabelText('E-mail'),'next@example.test');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));}
 return{interaction,transport,calls,switchAccount,completionSnapshots,lists};
}
const selectedLabel='Remover jogo Jogo HTTP dos favoritos';
const unselectedLabel='Favoritar jogo Jogo HTTP';

test.each(['/','/jogos/12','/perfil/1','/comunidade'])('estrela real junto ao título em %s sem GET por card',async path=>{
 const {calls,transport,interaction}=await open(path);if(path==='/comunidade')await interaction.click(screen.getByRole('button',{name:'Jogos em discussão'}));
 const star=await screen.findByRole('button',{name:selectedLabel});expect(star).toHaveAttribute('aria-pressed','true');expect(star).toHaveTextContent('★');expect(star.closest('a')).toBeNull();
 const row=star.closest<HTMLElement>('.game-detail-header') ?? star.parentElement!;expect(within(row).getByRole('heading',{name:'Jogo HTTP'})).toBeVisible();expect(star).toHaveAttribute('title',selectedLabel);
 expect(calls('/favorites','GET')).toHaveLength(1);expect(transport.mock.calls.some(([url,init])=>/\/favorites\/game\/\d+$/.test(url)&&init.method==='GET')).toBe(false);
 if(path==='/jogos/12'){expect(screen.queryByRole('button',{name:'Favoritar jogo'})).not.toBeInTheDocument();expect(within(screen.getByRole('region',{name:'Reviews do jogo'})).queryByRole('button',{name:/Favoritar jogo|Remover jogo/})).not.toBeInTheDocument();}
});
test('PUT/DELETE confirmados não navegam, não avaliam e não publicam',async()=>{
 const {interaction,calls,transport}=await open();await interaction.click(await screen.findByRole('button',{name:selectedLabel}));await screen.findByRole('button',{name:unselectedLabel});
 await interaction.click(screen.getByRole('button',{name:unselectedLabel}));expect(await screen.findByRole('button',{name:selectedLabel})).toHaveAttribute('aria-pressed','true');
 expect(calls('/favorites/game/12','DELETE')).toHaveLength(1);expect(calls('/favorites/game/12','PUT')).toHaveLength(1);for(const [,init]of [...calls('/favorites/game/12','PUT'),...calls('/favorites/game/12','DELETE')]){expect(init.body).toBeUndefined();expect(init.headers).toHaveProperty('Authorization','Bearer test-1');}
 expect(screen.getByRole('heading',{name:'Game Reviews'})).toBeVisible();expect(transport.mock.calls.some(([url])=>/\/games\/12$|\/rating|\/games\/12\/reviews$/.test(url))).toBe(false);
});
test('instâncias sincronizadas, clique duplo e IDs de jogo/review independentes',async()=>{
 const pending=deferred<Response>();const {calls,interaction}=await open('/',{duplicate:true,write:async kind=>kind==='game'?pending.promise:new Response(null,{status:204})});
 const stars=await screen.findAllByRole('button',{name:selectedLabel});expect(stars).toHaveLength(2);fireEvent.click(stars[0]);fireEvent.click(stars[1]);expect(calls('/favorites/game/12','DELETE')).toHaveLength(1);for(const star of stars)expect(star).toBeDisabled();
 const review=screen.getByRole('button',{name:'Remover review de Ana dos favoritos'});expect(review).toBeEnabled();await interaction.click(review);await screen.findByRole('button',{name:'Favoritar review de Ana'});
 await act(async()=>pending.resolve(new Response(null,{status:204})));await waitFor(()=>expect(screen.getAllByRole('button',{name:unselectedLabel})).toHaveLength(2));expect(calls('/favorites','GET')).toHaveLength(2);
});
test('visitante abre login pelo ícone sem leitura/escrita privada',async()=>{
 const {interaction,calls}=await open('/',{guest:true});const star=await screen.findByRole('button',{name:unselectedLabel});expect(star).not.toHaveAttribute('aria-pressed');await interaction.click(star);expect(screen.getByRole('form',{name:'Login'})).toBeVisible();expect(calls('/favorites')).toHaveLength(0);expect(calls('/favorites/game/12')).toHaveLength(0);
});
test('loading sem seleção inventada e erro de leitura com retry compartilhado',async()=>{
 const pending=deferred<Response>();const {interaction,calls}=await open('/',{read:async read=>read===1?pending.promise:Response.json({games:[],reviews:[]})});
 const loading=await screen.findByRole('button',{name:'Carregando favorito do jogo Jogo HTTP'});expect(loading).toBeDisabled();expect(loading).not.toHaveAttribute('aria-pressed');
 await act(async()=>pending.resolve(Response.json({code:'storage_unavailable',message:'Falha'},{status:503})));await interaction.click(await screen.findByRole('button',{name:'Tentar novamente favoritos do jogo Jogo HTTP'}));expect(await screen.findByRole('button',{name:unselectedLabel})).toHaveAttribute('aria-pressed','false');expect(calls('/favorites')).toHaveLength(2);
});
test('falha de escrita preserva estrela e permite nova tentativa',async()=>{
 let fail=true;const {interaction}=await open('/',{write:async()=>fail?Response.json({code:'storage_unavailable',message:'Falha'},{status:503}):new Response(null,{status:204})});await interaction.click(await screen.findByRole('button',{name:selectedLabel}));await screen.findByText('Não foi possível atualizar o favorito. Tente novamente.');expect(screen.getByRole('button',{name:selectedLabel})).toHaveAttribute('aria-pressed','true');fail=false;await interaction.click(screen.getByRole('button',{name:selectedLabel}));await screen.findByRole('button',{name:unselectedLabel});
});
test.each(['leitura','escrita'])('resposta antiga de %s não contamina nova sessão',async mode=>{
 const pending=deferred<Response>();const {switchAccount,interaction}=await open('/',mode==='leitura'?{read:async n=>n===1?pending.promise:Response.json({games:[],reviews:[]})}:{write:async()=>pending.promise});if(mode==='escrita')await interaction.click(await screen.findByRole('button',{name:selectedLabel}));await switchAccount();await screen.findByRole('button',{name:unselectedLabel});await act(async()=>pending.resolve(mode==='leitura'?Response.json({games:[wireGame],reviews:[]}):new Response(null,{status:204})));expect(screen.getByRole('button',{name:unselectedLabel})).toHaveAttribute('aria-pressed','false');expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Outra conta');
});
test('remover terceiro favorito revalida lista e dados de conclusão ao abrir modal',async()=>{
 const {interaction,completionSnapshots}=await open('/perfil/1');const section=await screen.findByRole('region',{name:'Jogos favoritos'});await interaction.click(await within(section).findByRole('button',{name:selectedLabel}));await waitFor(()=>expect(within(section).getAllByRole('listitem')).toHaveLength(2));
 await interaction.click(screen.getByRole('button',{name:'Editar perfil'}));const dialog=await screen.findByRole('dialog',{name:'Editar perfil'});await waitFor(()=>expect(within(dialog).getByRole('list',{name:'Jogos selecionados'}).children).toHaveLength(2));expect(completionSnapshots.at(-1)).toEqual([13,14]);
});
