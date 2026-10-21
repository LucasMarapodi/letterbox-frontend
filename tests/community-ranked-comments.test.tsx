import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireComment, wireReview, withAuthentication, withFilterOptions } from './http-fixtures';
import { deferred } from './fixtures';

const first = {commentId:81,reviewId:55,gameId:12,parentCommentId:null,text:'Comentário antigo popular',createdAt:'2020-01-01T12:00:00Z',author:wireReview.author,likeCount:9,periodLikeCount:4,lastLikeAt:'2026-10-16T12:00:00Z'};
const second = {...first,commentId:82,parentCommentId:81,text:'Resposta popular',author:{...first.author,id:2,displayName:'Leo'},likeCount:3,periodLikeCount:2};
const envelope = (query:URLSearchParams,items:unknown[]=[first,second],hasNextPage=false) => ({items,page:Number(query.get('page')),pageSize:Number(query.get('pageSize')),hasNextPage});
type Options = {
  authenticated?:boolean; liked?:boolean;
  ranking?:(query:URLSearchParams,read:number)=>Promise<Response>;
  write?:()=>Promise<Response>;
};
async function open(options:Options={}) {
  let reads=0; let liked=options.liked??false;
  const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/comments/most-liked')) {reads++;const query=new URL(url).searchParams;return options.ranking?options.ranking(query,reads):Response.json(envelope(query));}
    if(path.match(/\/comments\/\d+\/like\/me$/)) return Response.json({likedByMe:liked});
    if(path.match(/\/comments\/\d+\/like$/)) {const response=options.write?await options.write():new Response(null,{status:204});if(response.ok)liked=init.method==='PUT';return response;}
    if(path.endsWith('/reviews/55/comments'))return Response.json([{...wireComment,text:first.text,likeCount:first.likeCount},{...wireComment,id:82,parentCommentId:81,userId:2,author:second.author,text:second.text,likeCount:second.likeCount}]);
    if(path.endsWith('/reviews/55'))return Response.json(wireReview);
    if(path.endsWith('/like/me'))return Response.json({likedByMe:false});
    if(path.endsWith('/favorites'))return Response.json({games:[],reviews:[]});
    return Response.json([]);
  }));
  const adapters=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport:withFilterOptions(transport)});
  if(options.authenticated)await adapters.auth.login({email:'ranking@example.test',password:'test-only'});
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={adapters}/></MemoryRouter>);
  const interaction=userEvent.setup();
  await interaction.click(screen.getByRole('button',{name:'Comentários curtidos'}));
  const calls=()=>transport.mock.calls.filter(([url])=>url.includes('/comments/most-liked'));
  return {interaction,transport,calls};
}
const region=()=>screen.getByRole('region',{name:'Comentários mais curtidos'});

test('ranking público usa 7d/1/20, mantém seções e distingue total e período sem estado pessoal',async()=>{
  const {transport,calls}=await open();
  expect(await screen.findByText(first.text)).toBeVisible();
  for(const label of ['Recentes','Mais comentadas','Jogos em discussão','Mais curtidas'])expect(screen.getByRole('button',{name:label})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Feed de reviews'})).not.toBeInTheDocument();
  const [url,request]=calls()[0];expect(Object.fromEntries(new URL(url).searchParams)).toEqual({period:'7d',page:'1',pageSize:'20'});
  expect(request.headers).not.toHaveProperty('Authorization');expect(request.method).toBe('GET');
  expect(within(region()).getByText('4 curtidas no período')).toBeVisible();expect(within(region()).getByText('9 curtidas no total')).toBeVisible();
  expect(within(region()).getByText('Resposta em uma review')).toBeVisible();
  expect(within(region()).getAllByRole('link',{name:'Ver jogo'})[0]).toHaveAttribute('href','/jogos/12');
  expect(within(region()).getByRole('link',{name:'Ana'})).toHaveAttribute('href','/perfil/1');
  expect(screen.getByText('Exibindo 2 comentários · até 20 por página')).toBeVisible();
  expect(within(region()).queryByRole('button',{name:/Curtir|curtida/})).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([url])=>/\/comments\/\d+\/like/.test(url))).toBe(false);
});

test('paginação vem da API e período/tamanho resetam página preservando tamanho',async()=>{
  const {interaction,calls}=await open({ranking:async q=>Response.json(envelope(q,[Number(q.get('page'))===1?first:second],Number(q.get('page'))===1))});
  await screen.findByText(first.text);
  expect(screen.getByRole('button',{name:'Anterior'})).toBeDisabled();
  await interaction.click(screen.getByRole('button',{name:'Próxima'}));await screen.findByText(second.text);
  expect(screen.queryByText(first.text)).not.toBeInTheDocument();expect(screen.getByText('Página 2')).toBeVisible();
  expect(screen.getByRole('button',{name:'Próxima'})).toBeDisabled();
  await interaction.selectOptions(screen.getByLabelText('Comentários por página'),'50');await screen.findByText(first.text);
  expect(screen.getByText('Exibindo 1 comentário · até 50 por página')).toBeVisible();
  await interaction.click(screen.getByRole('button',{name:'Próxima'}));await screen.findByText(second.text);
  await interaction.selectOptions(screen.getByLabelText('Período dos rankings'),'24h');await screen.findByText(first.text);
  await interaction.selectOptions(screen.getByLabelText('Período dos rankings'),'30d');await waitFor(()=>expect(calls()).toHaveLength(6));
  expect(calls().map(([url])=>Object.fromEntries(new URL(url).searchParams))).toEqual([
    {period:'7d',page:'1',pageSize:'20'},{period:'7d',page:'2',pageSize:'20'},
    {period:'7d',page:'1',pageSize:'50'},{period:'7d',page:'2',pageSize:'50'},
    {period:'24h',page:'1',pageSize:'50'},{period:'30d',page:'1',pageSize:'50'},
  ]);
});

test('10 itens por página é opção real e página vazia não inventa total',async()=>{
  const {interaction}=await open({ranking:async q=>Response.json(envelope(q,[]))});
  await screen.findByText('Nenhum comentário curtido neste período.');
  await interaction.selectOptions(screen.getByLabelText('Comentários por página'),'10');
  expect(await screen.findByText('Exibindo 0 comentários · até 10 por página')).toBeVisible();
  expect(screen.getByRole('button',{name:'Próxima'})).toBeDisabled();
});

test('loading oculta resultados anteriores e resposta atrasada não substitui período atual',async()=>{
  const pending=deferred<Response>();
  const {interaction,calls}=await open({ranking:async(q,read)=>read===2?pending.promise:Response.json(envelope(q,read===1?[first]:[]))});
  await screen.findByText(first.text);await interaction.selectOptions(screen.getByLabelText('Período dos rankings'),'24h');
  expect(region()).toHaveAttribute('aria-busy','true');expect(screen.getByText('Carregando comentários mais curtidos…')).toHaveAttribute('role','status');expect(screen.queryByText(first.text)).not.toBeInTheDocument();
  await interaction.selectOptions(screen.getByLabelText('Período dos rankings'),'30d');await screen.findByText('Nenhum comentário curtido neste período.');
  await act(async()=>{pending.resolve(Response.json({items:[first],page:1,pageSize:20,hasNextPage:false}));});
  expect(screen.queryByText(first.text)).not.toBeInTheDocument();expect(calls()[1][1].signal?.aborted).toBe(true);
});

test.each([400,503,'network'])('erro %s permite retry da mesma consulta sem mostrar vazio',async failure=>{
  const {interaction,calls}=await open({ranking:async(q,read)=>{if(read===1){if(failure==='network')throw new Error('offline');return Response.json({code:failure===503?'storage_unavailable':'validation_failed',message:'Falha'},{status:failure as number});}return Response.json(envelope(q));}});
  expect(await screen.findByText('Não foi possível carregar os comentários mais curtidos.')).toHaveAttribute('role','alert');expect(screen.queryByText('Nenhum comentário curtido neste período.')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByText(first.text);
  expect(calls()).toHaveLength(2);expect(calls()[0][0]).toBe(calls()[1][0]);
});

test.each([
  {commentId:'81'},{reviewId:0},{gameId:1.5},{parentCommentId:'81'},
  {likeCount:-1},{periodLikeCount:0},{periodLikeCount:10},{author:{...wireReview.author,id:'1'}},
  {lastLikeAt:'ontem'},{likedByMe:true},
])('resposta inválida é erro de contrato, sem coerção: %j',async patch=>{
  await open({ranking:async q=>Response.json(envelope(q,[{...first,...patch}]))});
  expect(await screen.findByText('Não foi possível carregar os comentários mais curtidos.')).toBeVisible();
  expect(screen.queryByText(first.text)).not.toBeInTheDocument();
});

test.each([{page:2},{pageSize:10},{hasNextPage:'false'},{items:[first,first]}])('envelope incompatível é rejeitado: %j',async patch=>{
  await open({ranking:async q=>Response.json({...envelope(q),...patch})});
  expect(await screen.findByText('Não foi possível carregar os comentários mais curtidos.')).toBeVisible();
});

test.each([false,true])('like/unlike revalida ranking público com ordem/remoção da API: liked=%s',async liked=>{
  const {interaction,calls,transport}=await open({authenticated:true,liked,ranking:async(q,read)=>Response.json(envelope(q,read===1?[first,second]:liked?[]:[second,{...first,likeCount:10,periodLikeCount:5}]))});
  const button=await within(region()).findByRole('button',{name:liked?'Retirar curtida do comentário de Ana':'Curtir comentário de Ana'});
  await interaction.click(button);
  if(liked)await screen.findByText('Nenhum comentário curtido neste período.');
  else await waitFor(()=>expect(within(region()).getAllByRole('article').map(card=>card.querySelector('.review-text')?.textContent)).toEqual([second.text,first.text]));
  expect(calls()).toHaveLength(2);for(const [,request] of calls())expect(request.headers).not.toHaveProperty('Authorization');
  const commands=transport.mock.calls.filter(([url,init])=>url.endsWith('/comments/81/like')&&init.method!=='GET');
  expect(commands).toHaveLength(1);expect(commands[0][1].method).toBe(liked?'DELETE':'PUT');expect(commands[0][1].body).toBeUndefined();expect(commands[0][1].headers).toHaveProperty('Authorization','Bearer test-only');
});

test('falha na escrita não revalida nem remove o comentário',async()=>{
  const {interaction,calls}=await open({authenticated:true,write:async()=>Response.json({code:'storage_unavailable',message:'Falha'},{status:503})});
  await interaction.click(await within(region()).findByRole('button',{name:'Curtir comentário de Ana'}));
  await within(region()).findByRole('button',{name:'Consultar novamente curtida do comentário de Ana'});
  expect(screen.getByText(first.text)).toBeVisible();expect(screen.getByText('4 curtidas no período')).toBeVisible();expect(calls()).toHaveLength(1);
});

test.each([first,second])('cartão abre review e destaca o comentário %s',async comment=>{
  const {interaction}=await open();
  const link=await screen.findByRole('link',{name:`Abrir review do comentário de ${comment.author.displayName}`});
  expect(link).toHaveAttribute('href',`/reviews/55#comentario-${comment.commentId}`);
  await interaction.click(link);
  await waitFor(()=>expect(document.activeElement).toHaveAttribute('id',`comentario-${comment.commentId}`));
  expect(document.activeElement).toHaveTextContent(comment.text);
});
