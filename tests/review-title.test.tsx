import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { RatedReviewForm } from '../src/components/RatedReviewForm';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpAdapters, createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import type { ReviewInput } from '../src/services/communityContracts';
import { wireReview, wireUser, wireGame, withAuthentication, withFilterOptions } from './http-fixtures';
import { deferred } from './fixtures';

function form(initial: {initialTitle?:string|null;initialText?:string;initialRating?:number|null}={}) {
  const onSubmit=vi.fn<(input:ReviewInput)=>Promise<void>>().mockResolvedValue();const onCancel=vi.fn();
  render(<RatedReviewForm {...initial} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Salvar review" pendingLabel="Salvando…" failureMessage="Falha ao salvar."/>);
  return {onSubmit,onCancel,interaction:userEvent.setup()};
}
const titleField=()=>screen.getByRole('textbox',{name:'Título'});
const description=()=>screen.getByLabelText('Descrição (opcional)');

test('somente nota zero envia título null e não inventa conteúdo',async()=>{
  const {interaction,onSubmit}=form();expect(titleField()).not.toBeRequired();
  await interaction.click(screen.getByRole('radio',{name:'0 estrelas'}));await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(onSubmit).toHaveBeenCalledWith({rating:0,title:null,text:''});
});
test.each(['','   '])('descrição exige título válido: %j',async title=>{
  const {interaction,onSubmit}=form({initialRating:4});fireEvent.change(titleField(),{target:{value:title}});await interaction.type(description(),'Minha descrição');
  expect(titleField()).toBeRequired();await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(screen.getByText('Informe um título quando houver descrição.')).toHaveAttribute('role','alert');expect(titleField()).toHaveAttribute('aria-invalid','true');expect(onSubmit).not.toHaveBeenCalled();expect(description()).toHaveValue('Minha descrição');
});
test.each(['','  Descrição  '])('título é independente da descrição e valores são normalizados: %j',async text=>{
  const {interaction,onSubmit}=form({initialRating:2.5});fireEvent.change(titleField(),{target:{value:'  Minha aventura  '}});fireEvent.change(description(),{target:{value:text}});await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(onSubmit).toHaveBeenCalledWith({rating:2.5,title:'Minha aventura',text:text.trim()});
});
test.each([150,151])('limite é validado após trim: %i',async length=>{
  const {interaction,onSubmit}=form({initialRating:5});fireEvent.change(titleField(),{target:{value:`  ${'a'.repeat(length)}  `}});await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(screen.getByText('Até 150 caracteres. Título obrigatório quando houver descrição.')).toBeVisible();
  if(length===150)expect(onSubmit).toHaveBeenCalledWith({rating:5,title:'a'.repeat(150),text:''});
  else{expect(onSubmit).not.toHaveBeenCalled();expect(screen.getByText('Título deve ter até 150 caracteres.')).toBeVisible();}
});
test('edição carrega título e limpar só título mantém descrição e impede envio',async()=>{
  const {interaction,onSubmit}=form({initialTitle:'Título salvo',initialText:'Texto salvo',initialRating:4});expect(titleField()).toHaveValue('Título salvo');
  await interaction.clear(titleField());await interaction.click(screen.getByRole('button',{name:'Salvar review'}));expect(onSubmit).not.toHaveBeenCalled();expect(description()).toHaveValue('Texto salvo');
  await interaction.clear(description());await interaction.click(screen.getByRole('button',{name:'Salvar review'}));expect(onSubmit).toHaveBeenCalledWith({rating:4,title:null,text:''});
});
test('legado textual solicita título e nota sem alterar o texto',async()=>{
  const {interaction,onSubmit}=form({initialText:'Texto legado',initialRating:null});expect(titleField()).toHaveValue('');await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(screen.getByText('Informe um título quando houver descrição.')).toBeVisible();expect(screen.getByText('Escolha uma nota de 0 a 5.')).toBeVisible();expect(description()).toHaveValue('Texto legado');expect(onSubmit).not.toHaveBeenCalled();
});
test('erro preserva rascunho e retry; cancelar não salva',async()=>{
  const {interaction,onSubmit,onCancel}=form({initialTitle:'Rascunho',initialText:'Descrição',initialRating:3});onSubmit.mockRejectedValueOnce(new Error('offline'));
  await interaction.click(screen.getByRole('button',{name:'Salvar review'}));await screen.findByText('Falha ao salvar.');expect(titleField()).toHaveValue('Rascunho');expect(description()).toHaveValue('Descrição');
  await interaction.click(screen.getByRole('button',{name:'Salvar review'}));expect(onSubmit).toHaveBeenCalledTimes(2);await interaction.click(screen.getByRole('button',{name:'Cancelar'}));expect(onCancel).toHaveBeenCalledOnce();
});
test('envio duplo mantém título/texto travados e envia uma vez',async()=>{
  const pending=deferred<void>();const {onSubmit}=form({initialTitle:'Título',initialText:'Texto',initialRating:4});onSubmit.mockReturnValue(pending.promise);
  fireEvent.submit(screen.getByRole('form',{name:'Salvar review'}));fireEvent.submit(screen.getByRole('form',{name:'Salvar review'}));expect(onSubmit).toHaveBeenCalledOnce();expect(titleField()).toBeDisabled();expect(description()).toBeDisabled();expect(screen.getByRole('button',{name:'Cancelar'})).toBeDisabled();await act(async()=>pending.resolve());
});

function adapter(payload:unknown={...wireReview,title:'Título da API'}) {
  const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockImplementation(async()=>Response.json(payload));
  return {http:createHttpAdapters({apiBaseUrl:'http://localhost:5080'},{session,transport}),transport};
}
test('POST/PATCH enviam título e diferenciam omissão de limpeza',async()=>{
  const {http,transport}=adapter();
  await http.games.publish(12,{rating:0,text:'Texto',...{title:'Título'}});await http.reviews.edit(55,{rating:3});await http.reviews.edit(55,{...{title:null},text:''});
  expect(transport.mock.calls.map(([,init])=>JSON.parse(String(init.body)))).toEqual([{rating:0,title:'Título',text:'Texto'},{rating:3},{title:null,text:''}]);
  for(const [,init]of transport.mock.calls)expect(init.headers).toHaveProperty('Authorization','Bearer test-only');
});
test.each([undefined,null,'Título da API'])('decodifica título/legado sem perder conteúdo: %j',async title=>{
  const {http}=adapter({...wireReview,title});expect(await http.reviews.get(55)).toMatchObject({title:title??null,text:wireReview.text});
});
test.each([123,{},'a'.repeat(151)])('título incompatível é erro de contrato: %j',async title=>{
  const {http}=adapter({...wireReview,title});await expect(http.reviews.get(55)).rejects.toMatchObject({kind:'contract'});
});

const titled={...wireReview,id:2,title:'Uma aventura inesquecível'};
const ratingOnly={...wireReview,id:1,title:null,text:'',createdAt:'2026-10-16T12:00:00Z'};
const legacy={...wireReview,id:3,text:'Texto histórico',title:null};
async function application(path:string,options:{errorCode?:string;reviews?:unknown[]}={}) {
  const reviews=options.reviews??[titled,ratingOnly,legacy];
  const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    const p=new URL(url).pathname;
    if((init.method==='POST'&&p.endsWith('/reviews'))||init.method==='PATCH')return options.errorCode?Response.json({code:options.errorCode,message:'Seguro'},{status:400}):Response.json({...titled,...JSON.parse(String(init.body))});
    if(p.endsWith('/reviews/me'))return Response.json({review:titled});
    if(p.endsWith('/reviews/2'))return Response.json(titled);
    if(p.endsWith('/games/12'))return Response.json(wireGame);
    if(p.endsWith('/opinions'))return Response.json({averageRating:4.5,reviews});
    if(p.endsWith('/favorites'))return Response.json({games:[],reviews});
    if(p.includes('/favorites/'))return Response.json({favorite:null});
    if(p.endsWith('/like/me'))return Response.json({likedByMe:false});
    if(p.endsWith('/users/1'))return Response.json(wireUser);
    if(p.endsWith('/recent')||p.endsWith('/users/1/reviews')||p.endsWith('/following'))return Response.json(reviews);
    if(p.endsWith('/most-commented'))return Response.json(reviews.map((review,index)=>({review,commentCount:10-index,lastCommentAt:wireReview.createdAt})));
    return Response.json([]);
  }));
  const services=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'},{transport:withFilterOptions(transport)});await services.auth.login({email:'test@example.test',password:'test-only'});
  render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={services}/></MemoryRouter>);return {interaction:userEvent.setup(),transport};
}
test.each(['/reviews/2','/jogos/12','/perfil/1','/comunidade'])('título é exibido em %s sem inventar título no legado',async path=>{
  await application(path);const headings=await screen.findAllByRole('heading',{name:titled.title});expect(headings.length).toBeGreaterThan(0);
  if(path!=='/reviews/2'&&path!=='/perfil/1'){expect(await screen.findAllByText('Texto histórico')).not.toHaveLength(0);expect(screen.queryByRole('heading',{name:'Texto histórico'})).not.toBeInTheDocument();}
});
test('perfil pagina ordem recebida antes do slice e preserva reviews sem título',async()=>{
  const {interaction}=await application('/perfil/1');const region=await screen.findByRole('region',{name:'Reviews do usuário'});await within(region).findByRole('heading',{name:titled.title});
  expect(within(region).getAllByRole('article').map(card=>card.querySelector('a.review-card-link')?.getAttribute('href'))).toEqual(['/reviews/2','/reviews/1']);
  await interaction.click(within(region).getByRole('button',{name:/Próxima página/}));expect(await within(region).findByText('Texto histórico')).toBeVisible();
});
test('rankings preservam métrica/ordem e feed exibe o título',async()=>{
  const {interaction}=await application('/comunidade',{reviews:[ratingOnly,titled]});await interaction.click(screen.getByRole('button',{name:'Mais comentadas'}));
  const region=screen.getByRole('region',{name:'Reviews mais comentadas'});await within(region).findByRole('heading',{name:titled.title});expect(within(region).getAllByRole('article').map(card=>card.querySelector('.review-card-link')?.getAttribute('href'))).toEqual(['/reviews/1','/reviews/2']);
  await interaction.click(screen.getByRole('button',{name:'Feed de reviews'}));expect(await screen.findByRole('heading',{name:titled.title})).toBeVisible();
});
test.each([['review_title_required','Informe um título quando houver descrição.'],['review_title_too_long','Título deve ter até 150 caracteres.']])('erro HTTP %s fica no título e preserva rascunho',async(code,message)=>{
  const {interaction}=await application('/reviews/2',{errorCode:code});await interaction.click(await screen.findByRole('button',{name:'Editar minha review'}));expect(titleField()).toHaveValue(titled.title);await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(await screen.findByText(message)).toBeVisible();expect(titleField()).toHaveAttribute('aria-invalid','true');expect(description()).toHaveValue(titled.text);
});
