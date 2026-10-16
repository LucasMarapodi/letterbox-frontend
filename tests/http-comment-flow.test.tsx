import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview, wireComment, withAuthentication } from './http-fixtures';
test('comentários públicos e POST com apenas text/Bearer usam DTO validado',async()=>{
  const session=createHttpSessionStore(); session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const transport=vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json([wireComment])).mockResolvedValueOnce(Response.json(wireComment,{status:201}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session}).community;
  expect(await service.getComments(wireReview.id)).toEqual([wireComment]); expect(transport.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  expect(await service.comment(wireReview.id,wireComment.text,{...wireUser,id:'forged'})).toEqual(wireComment);
  expect(transport.mock.calls[1][0].endsWith('/reviews/r%2F1/comments')).toBe(true); expect(transport.mock.calls[1][1]).toMatchObject({method:'POST',body:'{"text":"Comentário"}',headers:{Authorization:'Bearer test-only'}});
});
test('visitante/logout não autorizam User forjado; 401 limpa sessão e impede nova escrita',async()=>{
  const session=createHttpSessionStore(); const transport=vi.fn<FetchTransport>().mockResolvedValue(Response.json({code:'unauthorized',message:'Seguro'},{status:401}));
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session}).community;
  await expect(service.comment('r','texto',wireUser)).rejects.toMatchObject({code:'session-required'}); expect(transport).not.toHaveBeenCalled();
  session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  await expect(service.comment('r','texto',wireUser)).rejects.toMatchObject({code:'session-required'}); expect(session.current()).toBeNull();
  await expect(service.comment('r','texto',wireUser)).rejects.toMatchObject({code:'session-required'}); expect(transport).toHaveBeenCalledTimes(1);
});
test.each([[400,'empty-text'],[404,'not-found']])('POST %s recebe erro tipado',async(status,code)=>{
  const session=createHttpSessionStore();session.establish({user:wireUser,token:'test-only',expiresAt:'2080-01-01T00:00:00Z'});
  const service=createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{session,transport:async()=>Response.json({code:status===400?'validation_failed':'not_found',message:'Seguro'},{status})}).community;
  await expect(service.comment('r','texto',wireUser)).rejects.toMatchObject({code});
});
async function open(status?:number,visitor=false):Promise<{interaction:ReturnType<typeof userEvent.setup>;transport:ReturnType<typeof vi.fn<FetchTransport>>}>{
  let sent=false;
  const transport=vi.fn<FetchTransport>().mockImplementation(withAuthentication(async(url,init)=>{
    if(new URL(url).pathname==='/api/v1/games') return Response.json([]);
    if(url.endsWith('/auth/logout')) return new Response(null,{status:204});
    if(url.endsWith('/comments')) {
      if(init.method==='POST'){
        if(status===0) throw new Error('offline');
        if(status) return Response.json({code:status===400?'validation_failed':'not_found',message:'Seguro'},{status});
        sent=true;return Response.json(wireComment,{status:201});
      }
      return Response.json(sent?[wireComment]:[]);
    }
    return Response.json({...wireReview,userId:'other',author:{...wireReview.author,id:'other',displayName:'Outro'}});
  }));
  const interaction=userEvent.setup();render(<MemoryRouter initialEntries={[visitor?'/reviews/r%2F1':'/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport})}/></MemoryRouter>);
  if(!visitor){await interaction.type(screen.getByLabelText('E-mail'),'test@example.com');await interaction.type(screen.getByLabelText('Senha'),'test-only');await interaction.click(screen.getByRole('button',{name:'Entrar'}));await interaction.click(await screen.findByRole('link',{name:'Review de exemplo'}));}
  await screen.findByRole('heading',{name:'Review de Outro'});return {interaction,transport};
}
test('201 consulta lista, exibe uma vez, limpa campo e logout remove envio',async()=>{
  const {interaction,transport}=await open();await interaction.type(await screen.findByLabelText('Seu comentário'),'Comentário');await interaction.dblClick(screen.getByRole('button',{name:'Publicar comentário'}));
  expect(await screen.findByText('Comentário publicado.')).toBeVisible(); const comments=await screen.findByRole('list',{name:'Comentários da review'});
  expect(within(comments).getAllByText('Comentário')).toHaveLength(1); expect(screen.getByLabelText('Seu comentário')).toHaveValue('');expect(transport.mock.calls.filter(([url,init])=>url.endsWith('/comments')&&init.method==='POST')).toHaveLength(1);
  await interaction.click(screen.getByRole('button',{name:'Sair'})); expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument();expect(within(comments).getByText('Comentário')).toBeVisible();
});
test.each([[400,'Seu comentário não foi aceito. Verifique o texto.'],[404,'Esta review não está mais disponível.'],[0,'Não foi possível publicar o comentário. Tente novamente.']])('erro %s preserva comentário sem inserir sucesso local',async(status,message)=>{
  const {interaction}=await open(status);await interaction.type(await screen.findByLabelText('Seu comentário'),'rascunho');await interaction.click(screen.getByRole('button',{name:'Publicar comentário'}));
  expect(await screen.findByText(message)).toBeVisible();expect(screen.getByLabelText('Seu comentário')).toHaveValue('rascunho');expect(screen.queryByText('Comentário publicado.')).not.toBeInTheDocument();expect(screen.queryByRole('list',{name:'Comentários da review'})).not.toBeInTheDocument();
});
test('visitante consulta comentários HTTP sem formulário',async()=>{const {transport}=await open(undefined,true);expect(await screen.findByText('Nenhum comentário nesta review.')).toBeVisible();expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument();expect(transport.mock.calls.filter(([url,init])=>url.endsWith('/comments')&&init.method==='GET')).toHaveLength(1);});
