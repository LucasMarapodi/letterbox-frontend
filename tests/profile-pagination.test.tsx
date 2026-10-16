import { ServiceProvider } from '../src/services/ServiceProvider';
import { ConnectionsSections } from '../src/components/ConnectionsSections';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {expect,test,vi} from 'vitest';
import {AppRoutes} from '../src/App';
import {createDefaultApplicationServices} from '../src/services/runtime';
import type {FetchTransport} from '../src/services/http/client';
import {wireUser,wireGame,wireReview,withAuthentication} from './http-fixtures';
const sections=['Jogos favoritos','Reviews do usuário','Reviews favoritas','Seguidores','Seguindo'];
async function open(counts=[7,5,5,13,13],guest=false){
 let favorites=Array.from({length:counts[2]},(_,i)=>({...wireReview,id:200+i,text:`Favorita ${i}`,game:{...wireReview.game,title:`Favorito ${i}`}}));
 const games=Array.from({length:counts[0]},(_,i)=>({...wireGame,id:100+i,title:`Jogo ${i}`}));
 const reviews=Array.from({length:counts[1]},(_,i)=>({...wireReview,id:300+i,text:`Publicada ${i}`,game:{...wireReview.game,title:`Publicado ${i}`}}));
 const people=(n:number)=>Array.from({length:n},(_,i)=>({...wireUser,id:500+i,username:`pessoa${i}`,displayName:`Pessoa ${i}`}));
 const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url)=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/favorites'))return Response.json({games,reviews:favorites});
  if(path.includes('/favorites/review/')){favorites=favorites.filter(item=>!path.endsWith(`/${item.id}`));return new Response(null,{status:204});}
  if(path.endsWith('/like/me'))return Response.json({likedByMe:false});
  if(path.endsWith('/followers'))return Response.json(people(counts[3]));
  if(path.endsWith('/following'))return Response.json(people(counts[4]));
  if(path.endsWith('/reviews'))return Response.json(reviews);
  if(path.endsWith('/profile-completion'))return Response.json({country:null,state:null,bio:'',avatarUrl:null,favoriteGameIds:games.map(game=>game.id),favoriteGameCount:games.length,isComplete:false});
  if(path.endsWith('/auth/logout'))return new Response(null,{status:204});
  if(path.endsWith('/games/filters'))return Response.json({genres:[],platforms:[]});
  if(path.endsWith('/games'))return Response.json({items:[],page:1,pageSize:20,hasNextPage:false});
  return Response.json(wireUser);
 }));
 const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});
 if(!guest)await services.auth.login({email:'test@example.test',password:'test-only'});
 render(<MemoryRouter initialEntries={['/perfil/1']}><AppRoutes adapters={services}/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Ana',level:2});await screen.findByRole('region',{name:'Seguidores'});if(!guest)await screen.findByRole('region',{name:'Jogos favoritos'});
 return {transport,interaction:userEvent.setup()};
}
function region(name:string){return within(screen.getByRole('region',{name}));}
function next(name:string){return region(name).getByRole('button',{name:`Próxima página de ${name.toLowerCase()}`});}
function previous(name:string){return region(name).getByRole('button',{name:`Página anterior de ${name.toLowerCase()}`});}
function items(name:string){return name==='Jogos favoritos'?region(name).getAllByRole('listitem'):name.startsWith('Reviews')?region(name).getAllByRole('article'):region(name).getAllByRole('listitem');}

test('cinco listas limitadas com páginas independentes, ordem e extremidades',async()=>{
 const {interaction,transport}=await open();expect(sections.map(name=>items(name).length)).toEqual([3,2,2,6,6]);
 const reads=()=>transport.mock.calls.filter(([url])=>/\/(favorites|followers|following|reviews)$/.test(new URL(url).pathname)).length;const before=reads();
 for(const name of sections){expect(previous(name)).toBeDisabled();await interaction.click(next(name));expect(region(name).getByText('Página 2 de 3')).toBeVisible();}
 expect(region('Jogos favoritos').getByRole('link',{name:'Jogo 3'})).toBeVisible();expect(region('Reviews do usuário').getByText('Publicada 2')).toBeVisible();expect(region('Reviews favoritas').getByText('Favorita 2')).toBeVisible();expect(region('Seguidores').getByRole('link',{name:'Pessoa 6'})).toBeVisible();
 await interaction.click(next('Jogos favoritos'));expect(items('Jogos favoritos')).toHaveLength(1);expect(next('Jogos favoritos')).toBeDisabled();expect(region('Seguindo').getByText('Página 2 de 3')).toBeVisible();expect(reads()).toBe(before);
});
test.each([[0,0,0,0,0],[3,2,2,6,6]])('zero/limite exato sem controles: %j',async(...counts)=>{
 await open(counts);expect(screen.queryByRole('button',{name:/página de/i})).not.toBeInTheDocument();if(counts[2]===0)expect(screen.queryByRole('region',{name:'Reviews favoritas'})).not.toBeInTheDocument();
});
test('limite mais um produz última página parcial em todas as listas',async()=>{
 const {interaction}=await open([4,3,3,7,7]);for(const name of sections){await interaction.click(next(name));expect(items(name)).toHaveLength(1);expect(next(name)).toBeDisabled();await interaction.click(previous(name));expect(previous(name)).toBeDisabled();}
});
test('remover último item da última página ajusta só reviews favoritas',async()=>{
 const {interaction}=await open([7,5,3,13,13]);await interaction.click(next('Jogos favoritos'));await interaction.click(next('Reviews favoritas'));
 await interaction.click(await region('Reviews favoritas').findByRole('button',{name:'Remover review de Ana dos favoritos'}));
 await waitFor(()=>expect(items('Reviews favoritas')).toHaveLength(2));expect(region('Reviews favoritas').queryByRole('button',{name:/página de/i})).not.toBeInTheDocument();expect(region('Jogos favoritos').getByText('Página 2 de 3')).toBeVisible();
});
test('modal usa coleção completa mesmo com somente três favoritos visíveis',async()=>{
 const {interaction}=await open();await interaction.click(next('Jogos favoritos'));await interaction.click(screen.getByRole('button',{name:'Editar perfil'}));const dialog=await screen.findByRole('dialog',{name:'Editar perfil'});expect(await within(dialog).findAllByRole('button',{name:/^Remover Jogo/})).toHaveLength(7);
});
test('sair e reabrir perfil reinicia páginas e não mostra favoritos privados',async()=>{
 const {interaction}=await open();await interaction.click(next('Seguidores'));await interaction.click(screen.getByRole('button',{name:'Sair'}));await interaction.click(screen.getByRole('link',{name:'Entrar'}));await interaction.type(screen.getByLabelText('E-mail'),'test@example.test');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await interaction.click(await screen.findByRole('link',{name:'Meu perfil'}));expect(await within(await screen.findByRole('region',{name:'Seguidores'})).findByText('Página 1 de 3')).toBeVisible();
});
test('visitantes não veem convites textuais para favoritar',async()=>{await open([0,3,0,7,7],true);expect(screen.queryByText(/Entrar para favoritar/)).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Jogos favoritos'})).not.toBeInTheDocument();});
test('revalidar conexões ajusta seguidores sem reiniciar seguindo',async()=>{
 let count=7;
 const transport:FetchTransport=async(url)=>Response.json(Array.from({length:url.endsWith('/followers')?count:13},(_,i)=>({...wireUser,id:50+i,username:`pessoa${i}`,displayName:`Pessoa ${i}`})));
 const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});
 const view=render(<MemoryRouter><ServiceProvider value={services}><ConnectionsSections profileId={1}/></ServiceProvider></MemoryRouter>);
 await screen.findByRole('region',{name:'Seguidores'});await userEvent.click(next('Seguidores'));await userEvent.click(next('Seguindo'));count=6;
 view.rerender(<MemoryRouter><ServiceProvider value={services}><ConnectionsSections profileId={1} revision={1}/></ServiceProvider></MemoryRouter>);
 await screen.findByRole('region',{name:'Seguidores'});expect(items('Seguidores')).toHaveLength(6);expect(region('Seguidores').queryByRole('navigation')).not.toBeInTheDocument();expect(region('Seguindo').getByText('Página 2 de 3')).toBeVisible();
});
test('navegar para outro perfil reinicia as páginas públicas',async()=>{
 const {interaction}=await open();await interaction.click(next('Seguidores'));await interaction.click(next('Reviews do usuário'));await interaction.click(region('Seguidores').getByRole('link',{name:'Pessoa 6'}));
 const followers=await screen.findByRole('region',{name:'Seguidores'});expect(within(followers).getByText('Página 1 de 3')).toBeVisible();expect(region('Reviews do usuário').getByText('Página 1 de 3')).toBeVisible();expect(screen.queryByRole('region',{name:'Favoritos'})).not.toBeInTheDocument();
});
