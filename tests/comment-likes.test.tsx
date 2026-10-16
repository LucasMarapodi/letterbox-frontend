import {act,fireEvent,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Link,MemoryRouter} from 'react-router-dom';
import {expect,test,vi} from 'vitest';
import {AppRoutes} from '../src/App';
import {createDefaultApplicationServices} from '../src/services/runtime';
import type {FetchTransport} from '../src/services/http/client';
import {wireComment,wireReview,wireUser,wirePage} from './http-fixtures';
import {deferred} from './fixtures';

async function open(options:{guest?:boolean;status?:(id:number,user:number)=>Promise<Response>;write?:(id:number)=>Promise<Response>;read?:()=>Promise<Response>;bonus?:number}={}){
 let account=wireUser;let reads=0;let bonus=0;const likers=new Map([[81,new Set<number>()],[82,new Set<number>()]]);
 const comments=()=>[{...wireComment,id:81,text:'Comentário principal',likeCount:(likers.get(81)?.size??0)+bonus},{...wireComment,id:82,userId:2,parentCommentId:81,text:'Uma resposta',author:{...wireComment.author,id:2,displayName:'Leo'},likeCount:2+(likers.get(82)?.size??0)}];
 const transport=vi.fn<FetchTransport>().mockImplementation(async(url,init)=>{
  const path=new URL(url).pathname;const owner=Number(String((init.headers as Record<string,string>)?.Authorization??'').split('-').at(-1));
  if(path.endsWith('/auth/login'))return Response.json({user:account,token:`test-${account.id}`,expiresAt:'2080-01-01T00:00:00Z'});
  if(path.endsWith('/auth/me'))return Response.json(account);
  if(path.endsWith('/auth/logout'))return new Response(null,{status:204});
  const match=path.match(/\/comments\/(\d+)\/like(\/me)?$/);
  if(match){const id=Number(match[1]);if(match[2])return options.status?options.status(id,owner):Response.json({likedByMe:likers.get(id)?.has(owner)??false});
   const response=options.write?await options.write(id):new Response(null,{status:204});if(response.ok){if(init.method==='PUT'){likers.get(id)?.add(owner);bonus=options.bonus??0;}else likers.get(id)?.delete(owner);}return response;}
  if(path.endsWith('/comments')){reads++;return reads>1&&options.read?options.read():Response.json(comments());}
  if(path.endsWith('/reviews/55'))return Response.json({...wireReview,userId:3,author:{...wireReview.author,id:3,displayName:'Autor'}});
  if(path.endsWith('/like/me'))return Response.json({likedByMe:false});
  if(path.endsWith('/favorites'))return Response.json({games:[],reviews:[]});
  if(path.includes('/favorites/'))return Response.json({favorite:null});
  if(path.endsWith('/games/filters'))return Response.json({genres:[],platforms:[]});
  if(path.endsWith('/games'))return Response.json(wirePage());
  return Response.json([]);
 });
 const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport});if(!options.guest)await services.auth.login({email:'test@example.test',password:'test-only'});
 render(<MemoryRouter initialEntries={['/reviews/55']}><AppRoutes adapters={services}/><Link to="/reviews/55">Abrir comentários de teste</Link></MemoryRouter>);
 await screen.findByText('Comentário principal');const interaction=userEvent.setup();
 const calls=(suffix:string,method?:string)=>transport.mock.calls.filter(([url,init])=>url.endsWith(suffix)&&(!method||init.method===method));
 async function relogin(){await interaction.click(screen.getByRole('button',{name:'Sair'}));account={...wireUser,id:4,displayName:'Outra conta'};await interaction.click(screen.getByRole('link',{name:'Entrar'}));await interaction.type(screen.getByLabelText('E-mail'),'next@example.test');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await interaction.click(screen.getByRole('link',{name:'Abrir comentários de teste'}));}
 return{interaction,transport,calls,relogin,comments};
}
function item(text='Comentário principal'){return within(screen.getByText(text).closest('li')!);}
const labels=['comentário de Ana','resposta de Leo'];
test.each(labels)('curtir e retirar %s usa Bearer sem corpo e confirma contagem pública',async label=>{
 const {interaction,calls}=await open();const id=label.startsWith('comentário')?81:82;const region=item(id===81?'Comentário principal':'Uma resposta');
 const button=await region.findByRole('button',{name:`Curtir ${label}`});expect(button).toHaveAttribute('aria-pressed','false');expect(region.getByText(id===81?'0 curtidas':'2 curtidas')).toBeVisible();await interaction.click(button);
 expect(await region.findByRole('button',{name:`Retirar curtida ${id===81?'do':'da'} ${label}`})).toHaveAttribute('aria-pressed','true');expect(region.getByText(id===81?'1 curtida':'3 curtidas')).toBeVisible();
 const request=calls(`/comments/${id}/like`,'PUT')[0][1];expect(request.body).toBeUndefined();expect(request.headers).toHaveProperty('Authorization','Bearer test-1');expect(request.headers).not.toHaveProperty('Content-Type');await interaction.click(region.getByRole('button',{name:`Retirar curtida ${id===81?'do':'da'} ${label}`}));await region.findByRole('button',{name:`Curtir ${label}`});expect(region.getByText(id===81?'0 curtidas':'2 curtidas')).toBeVisible();expect(calls(`/comments/${id}/like`,'DELETE')).toHaveLength(1);expect(calls('/reviews/55/comments','GET')).toHaveLength(3);expect(calls('/reviews/55/like','PUT')).toHaveLength(0);
});
test('visitante vê contagens e convite por comentário sem consultas privadas/escritas',async()=>{
 const {interaction,transport}=await open({guest:true});expect(item().getByText('0 curtidas')).toBeVisible();await interaction.click(item().getByRole('button',{name:'Curtir comentário de Ana'}));expect(item().getByRole('link',{name:'Entrar para curtir comentário de Ana'})).toHaveAttribute('href','/login');expect(transport.mock.calls.some(([url])=>/\/comments\/\d+\/like/.test(url))).toBe(false);expect(transport.mock.calls.some(([,init])=>init.method!=='GET')).toBe(false);
});
test('envio duplo trava só o alvo e outro comentário continua disponível',async()=>{
 const pending=deferred<Response>();const {interaction,calls}=await open({write:id=>id===81?pending.promise:Promise.resolve(new Response(null,{status:204}))});const button=await item().findByRole('button',{name:'Curtir comentário de Ana'});fireEvent.click(button);fireEvent.click(button);expect(calls('/comments/81/like','PUT')).toHaveLength(1);expect(button).toBeDisabled();await interaction.click(await item('Uma resposta').findByRole('button',{name:'Curtir resposta de Leo'}));await item('Uma resposta').findByRole('button',{name:'Retirar curtida da resposta de Leo'});await act(async()=>{pending.resolve(new Response(null,{status:204}));});await item().findByRole('button',{name:'Retirar curtida do comentário de Ana'});
});
test('contagem usa confirmação da API inclusive curtidas concorrentes',async()=>{const {interaction}=await open({bonus:4});await interaction.click(await item().findByRole('button',{name:'Curtir comentário de Ana'}));await item().findByRole('button',{name:'Retirar curtida do comentário de Ana'});expect(item().getByText('5 curtidas')).toBeVisible();});
test.each([false,true])('falha pessoal/contrato legado exige retry somente de leitura: legado=%s',async legacy=>{
 let fail=true;const {interaction,calls}=await open({status:async()=>fail?legacy?Response.json({liked:true}):Response.json({code:'storage_unavailable',message:'Falha'},{status:503}):Response.json({likedByMe:false})});const retry=await item().findByRole('button',{name:'Consultar novamente curtida do comentário de Ana'});expect(item().getByText('0 curtidas')).toBeVisible();fail=false;await interaction.click(retry);await item().findByRole('button',{name:'Curtir comentário de Ana'});expect(calls('/comments/81/like','PUT')).toHaveLength(0);
});
test.each([400,404,503,0])('erro %s de escrita preserva contagem e libera consulta, sem sucesso falso',async status=>{
 const {interaction,calls}=await open({write:async()=>{if(!status)throw new Error('offline');return Response.json({code:status===404?'not_found':status===503?'storage_unavailable':'validation_failed',message:'Falha'},{status});}});await interaction.click(await item().findByRole('button',{name:'Curtir comentário de Ana'}));await item().findByRole('button',{name:'Consultar novamente curtida do comentário de Ana'});expect(item().getByText('0 curtidas')).toBeVisible();expect(calls('/comments/81/like','PUT')).toHaveLength(1);expect(item().queryByRole('button',{name:'Retirar curtida do comentário de Ana'})).not.toBeInTheDocument();
});
test('204 com confirmação indisponível recupera por GET sem repetir PUT',async()=>{
 let fail=true;let snapshot=()=>[wireComment];
 const result=await open({read:async()=>fail?Response.json({code:'storage_unavailable',message:'Falha'},{status:503}):Response.json(snapshot())});snapshot=result.comments;
 await result.interaction.click(await item().findByRole('button',{name:'Curtir comentário de Ana'}));const retry=await item().findByRole('button',{name:'Consultar novamente curtida do comentário de Ana'});expect(item().getByText('0 curtidas')).toBeVisible();fail=false;await result.interaction.click(retry);await item().findByRole('button',{name:'Retirar curtida do comentário de Ana'});expect(item().getByText('1 curtida')).toBeVisible();expect(result.calls('/comments/81/like','PUT')).toHaveLength(1);
});
test.each(['leitura','escrita'])('resposta antiga de %s não contamina outra sessão',async mode=>{
 const old=deferred<Response>();const {interaction,relogin}=await open(mode==='leitura'?{status:async(id,user)=>id===81&&user===1?old.promise:Response.json({likedByMe:false})}:{write:()=>old.promise});if(mode==='escrita')await interaction.click(await item().findByRole('button',{name:'Curtir comentário de Ana'}));await relogin();expect(await item().findByRole('button',{name:'Curtir comentário de Ana'})).toHaveAttribute('aria-pressed','false');await act(async()=>{old.resolve(mode==='leitura'?Response.json({likedByMe:true}):new Response(null,{status:204}));});expect(item().getByRole('button',{name:'Curtir comentário de Ana'})).toHaveAttribute('aria-pressed','false');expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Outra conta');
});
